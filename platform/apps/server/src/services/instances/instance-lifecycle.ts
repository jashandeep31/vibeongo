import { and, db, eq, instances } from "@repo/db";
import { withRedisLock } from "../../cache/redis-lock.js";
import { AppError } from "../../lib/app-error.js";
import { resumeSuspendedSession } from "./resume-suspended-session.js";
import { suspendInstanceAndRevokeAccess } from "./suspend-instance-and-revoke-access.js";
import { terminateInstanceAndChargeUsage } from "./terminate-instance-and-charge-usage.js";

export type InstanceAction = "pause" | "terminate" | "resume";

type InstanceActionProps = {
  instanceId: string;
  action: InstanceAction;
  userId?: string;
  autoExpire?: boolean;
};

export const getTerminateOrPauseInstanceLockName = (instanceId: string) =>
  `terminate-or-pause-instance:${instanceId}`;

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
        await terminateInstanceAndChargeUsage(data);
        return;
      case "pause":
        if (instance.state === "suspended" || instance.state === "terminated")
          return;
        await suspendInstanceAndRevokeAccess(data);
        return;
      case "resume":
        if (instance.state === "running") return;
        if (instance.state !== "suspended") {
          throw new AppError("Only suspended instances can be resumed", 409);
        }
        if (!instance.project_session_id) {
          throw new AppError("Instance has no project session", 400);
        }
        await resumeSuspendedSession({
          sessionId: instance.project_session_id,
          userId: instance.user_id,
        });
        return;
    }
  };

export const runInstanceActionWithLock = async (
  props: InstanceActionProps & { userId: string },
) => {
  // Authorize before lock acquisition so a busy instance cannot bypass ownership.
  await getInstance(props);
  return withRedisLock(
    getTerminateOrPauseInstanceLockName(props.instanceId),
    createInstanceActionHandler(props),
  );
};
