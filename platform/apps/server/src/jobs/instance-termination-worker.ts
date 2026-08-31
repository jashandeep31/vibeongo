import { Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import { terminateInstanceAndChargeUsage } from "../services/instances/terminate-instance-and-charge-usage.js";
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
    await terminateInstanceAndChargeUsage(job.data);
  },
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
    concurrency: 2,
  },
);

instanceTerminationWorker.on("ready", () => {
  console.log("Instance termination worker is ready");
});

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
