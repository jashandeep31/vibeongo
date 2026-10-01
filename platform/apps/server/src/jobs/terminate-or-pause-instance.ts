import { Queue } from "bullmq";
import { redis } from "../lib/valkey.js";
import { db, eq, instances } from "@repo/db";
import { AppError } from "../lib/app-error.js";
import type { InstanceAction } from "../services/instances/instance-lifecycle.js";

export const TERMINATE_OR_PAUSE_INSTANCE_JOB_NAME =
  "terminate-or-pause-instance-job" as const;

export type InstanceActionJobData = {
  instanceId: string;
  action: InstanceAction;
  autoExpire?: boolean;
};

const terminateOrPauseInstanceQueue = new Queue<InstanceActionJobData>(
  TERMINATE_OR_PAUSE_INSTANCE_JOB_NAME,
  {
    connection: redis as any,
  },
);

terminateOrPauseInstanceQueue.on("error", (error) => {
  console.error("Instance lifecycle queue error", error);
});

export const addTerminateOrPauseInstanceJob = async ({
  instanceId,
  action = "terminate",
  delayInMinutes = 0,
  autoExpire = false,
}: {
  instanceId: string;
  action?: InstanceAction;
  delayInMinutes?: number;
  autoExpire?: boolean;
}) => {
  const [row] = await db
    .select()
    .from(instances)
    .where(eq(instances.id, instanceId));
  if (!row) throw new AppError("Instance not found", 404);
  if (autoExpire && action !== "terminate") {
    throw new AppError("Only termination can be scheduled at expiry", 400);
  }
  if (autoExpire && row.state !== "running") return;

  const delay = autoExpire
    ? Math.max(0, row.terminates_at.getTime() - Date.now())
    : delayInMinutes * 60 * 1000;
  const jobId = `instance-${action}-${instanceId}-${autoExpire ? "expiry" : "request"}`;
  const existingJob = await terminateOrPauseInstanceQueue.getJob(jobId);
  if (existingJob) {
    const state = await existingJob.getState();
    if (state === "failed") {
      await existingJob.retry("failed", { resetAttemptsMade: true });
      return;
    }
    if (state === "delayed") {
      // Resumes can extend expiry; manual requests can bring execution forward.
      if (
        autoExpire ||
        Date.now() + delay < existingJob.timestamp + existingJob.delay
      ) {
        await existingJob.changeDelay(delay);
      }
      return;
    }
    if (state !== "completed") return;
    await existingJob.remove();
  }
  await terminateOrPauseInstanceQueue.add(
    TERMINATE_OR_PAUSE_INSTANCE_JOB_NAME,
    {
      instanceId,
      action,
      autoExpire,
    },
    {
      jobId,
      attempts: 5,
      delay,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: true,
      removeOnFail: 500,
    },
  );
};
