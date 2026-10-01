import { DelayedError, Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import { lockNames, withRedisLock } from "../cache/redis-lock.js";
import { createInstanceActionHandler } from "../services/instances/instance-lifecycle.js";
import {
  TERMINATE_OR_PAUSE_INSTANCE_JOB_NAME,
  type InstanceActionJobData,
} from "./terminate-or-pause-instance.js";

export const terminateOrPauseInstanceWorker = new Worker<InstanceActionJobData>(
  TERMINATE_OR_PAUSE_INSTANCE_JOB_NAME,
  async (job, token) => {
    const lock = await withRedisLock(
      lockNames.instanceLifecycle(job.data.instanceId),
      createInstanceActionHandler(job.data),
    );

    if (!lock.acquired) {
      await job.moveToDelayed(Date.now() + 20_000, token);
      throw new DelayedError();
    }
    if (lock.result?.retryAt !== undefined) {
      await job.moveToDelayed(lock.result.retryAt, token);
      throw new DelayedError();
    }
  },
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
    concurrency: 2,
  },
);

terminateOrPauseInstanceWorker.on("error", (error) => {
  console.error("Instance lifecycle worker error", error);
});

terminateOrPauseInstanceWorker.on("failed", (job, error) => {
  console.error(`Instance lifecycle job ${job?.id ?? "unknown"} failed`, error);
});
