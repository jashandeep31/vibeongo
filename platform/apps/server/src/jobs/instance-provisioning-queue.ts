import { Queue } from "bullmq";
import { redis } from "../lib/valkey.js";

export const INSTANCE_PROVISIONING_QUEUE_NAME = "instance_provisioning";

const instanceProvisioningQueue = new Queue(INSTANCE_PROVISIONING_QUEUE_NAME, {
  connection: redis as any,
});
