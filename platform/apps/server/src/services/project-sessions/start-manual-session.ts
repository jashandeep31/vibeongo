import { db, eq, projectDomainRouting } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { invalidateProjectProxiesByPid } from "../../lib/invalidate-project-proxies-by-pid.js";
import { checkAndLaunchInstance } from "../instances/check-and-queue-instance-launch.js";
import { getManualSession } from "./session-access.js";

export async function startManualSession(
  userId: string,
  sessionId: string,
  runtime: "vm" | "sandbox",
) {
  await getManualSession(userId, sessionId);
  const instance = await checkAndLaunchInstance({
    userId,
    sessionId,
    runtime,
    spinedUpBy: "manual",
    category: "manual",
  });
  if (!instance.project_id)
    throw new AppError("Instance project not found", 500);

  await db
    .update(projectDomainRouting)
    .set({ target_instance_id: instance.id })
    .where(eq(projectDomainRouting.project_id, instance.project_id));
  await invalidateProjectProxiesByPid(instance.project_id);
  return instance;
}
