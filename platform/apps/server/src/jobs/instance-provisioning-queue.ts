import { Queue, Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import { instanceSlots } from "@repo/db";
import { SpinUpInstanceFromSlot } from "../services/instances/check-and-queue-instance-launch.js";

export const INSTANCE_PROVISIONING_QUEUE_NAME = "instance_provisioning";

const instanceProvisioningQueue = new Queue(INSTANCE_PROVISIONING_QUEUE_NAME, {
  connection: redis as any,
});

export const addToInstanceProvisioningQueue = async (slotId: string) => {
  await instanceProvisioningQueue.add(
    INSTANCE_PROVISIONING_QUEUE_NAME,
    slotId,
    { removeOnComplete: true, removeOnFail: true, attempts: 1 },
  );
};

new Worker<string>(
  INSTANCE_PROVISIONING_QUEUE_NAME,
  async (job) => {
    const slotId = job.data;
    await SpinUpInstanceFromSlot(slotId);
    return null;
  },
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
    concurrency: 1,
  },
);
