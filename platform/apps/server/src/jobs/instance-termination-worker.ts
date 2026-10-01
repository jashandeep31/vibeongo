import { Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import { addTerminateOrPauseInstanceJob } from "./terminate-or-pause-instance.js";
import {
  INSTANCE_TERMINATION_JOB_NAME,
  INSTANCE_TERMINATION_QUEUE_NAME,
  type InstanceTerminationJobData,
} from "./instance-termination.js";

export const instanceTerminationWorker = new Worker<
  InstanceTerminationJobData,
  void,
  typeof INSTANCE_TERMINATION_JOB_NAME
>(
  INSTANCE_TERMINATION_QUEUE_NAME,
  async (job) => {
    // Drain older termination jobs through the shared lifecycle queue and lock.
    await addTerminateOrPauseInstanceJob({
      instanceId: job.data.instanceId,
      action: "terminate",
    });
  },
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
    concurrency: 2,
  },
);

instanceTerminationWorker.on("completed", (job) => {
  console.log(`Instance termination job ${job.id ?? "unknown"} completed`);
});

instanceTerminationWorker.on("error", (error) => {
  console.error("Instance termination worker error", error);
});

instanceTerminationWorker.on("failed", (job, error) => {
  console.error(
    `Instance termination job ${job?.id ?? "unknown"} failed`,
    error,
  );
});
