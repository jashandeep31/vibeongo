import { and, db, eq, instances, sandboxTypes } from "@repo/db";
import { lockNames, withRedisLock } from "../../cache/redis-lock.js";
import { AppError } from "../../lib/app-error.js";
import { AUTOMATIC_SUSPENSION_PROVIDERS } from "../../providers/constants.js";
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
          const [sandboxType] = await db
            .select({ provider: sandboxTypes.provider })
            .from(sandboxTypes)
            .where(eq(sandboxTypes.id, instance.sandbox_type_id!));
          if (!sandboxType) throw new AppError("Sandbox type not found", 404);
          if (AUTOMATIC_SUSPENSION_PROVIDERS.has(sandboxType.provider)) {
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
