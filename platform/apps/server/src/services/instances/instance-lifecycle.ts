import { and, db, eq, instances, instanceSlots, sandboxTypes } from "@repo/db";
import { lockNames, withRedisLock } from "../../cache/redis-lock.js";
import { AppError } from "../../lib/app-error.js";
import { PAUSEABLE_SANDBOX_PROVIDERS } from "../../providers/constants.js";
import { suspendInstanceAndRevokeAccess } from "./suspend-instance-and-revoke-access.js";
import { terminateInstanceAndChargeUsage } from "./terminate-instance-and-charge-usage.js";

export type InstanceAction = "pause" | "terminate";

type InstanceActionProps = {
  instanceId: string;
  action: InstanceAction;
  userId?: string;
  autoExpire?: boolean;
};

const getInstance = async ({ instanceId, userId }: InstanceActionProps) => {
  const [instance] = await db
    .select()
    .from(instances)
    .where(
      userId === undefined
        ? eq(instances.id, instanceId)
        : and(eq(instances.id, instanceId), eq(instances.user_id, userId)),
    );
  if (!instance) throw new AppError("Instance not found", 404);
  return instance;
};

// Read the current state inside the lock, including when a delayed job retries.
export const createInstanceActionHandler =
  (props: InstanceActionProps) => async () => {
    const instance = await getInstance(props);
    const data = { instanceId: instance.id, userId: instance.user_id };

    if (props.autoExpire) {
      if (instance.state !== "running") return;
      if (instance.terminates_at.getTime() > Date.now()) {
        return { retryAt: instance.terminates_at.getTime() };
      }
    }

    switch (props.action) {
      case "terminate":
        if (instance.state === "terminated") return;
        if (props.autoExpire && instance.runtime_kind === "sandbox") {
          const [sandbox] = await db
            .select({
              provider: sandboxTypes.provider,
              category: instanceSlots.category,
            })
            .from(sandboxTypes)
            .leftJoin(
              instanceSlots,
              eq(instanceSlots.instance_id, instance.id),
            )
            .where(eq(sandboxTypes.id, instance.sandbox_type_id!));
          if (!sandbox) throw new AppError("Sandbox type not found", 404);
          if (
            sandbox.category === "manual" &&
            PAUSEABLE_SANDBOX_PROVIDERS.some(
              (provider) => provider === sandbox.provider,
            )
          ) {
            await suspendInstanceAndRevokeAccess(data);
            return;
          }
        }
        await terminateInstanceAndChargeUsage(data);
        return;
      case "pause":
        if (instance.state === "suspended" || instance.state === "terminated")
          return;
        await suspendInstanceAndRevokeAccess(data);
        return;
    }
  };

export const runInstanceActionWithLock = async (
  props: InstanceActionProps & { userId: string },
) => {
  // Authorize before lock acquisition so a busy instance cannot bypass ownership.
  await getInstance(props);
  return withRedisLock(
    lockNames.instanceLifecycle(props.instanceId),
    createInstanceActionHandler(props),
  );
};
