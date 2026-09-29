import { Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import { checkPushReceipts } from "../services/notifications/check-push-receipts.js";
import {
  NOTIFICATION_PUSH_RECEIPTS_JOB_NAME,
  NOTIFICATION_PUSH_RECEIPTS_QUEUE_NAME,
  type NotificationPushReceiptsJobData,
} from "./notification-push-receipts.js";

export const notificationPushReceiptsWorker = new Worker<
  NotificationPushReceiptsJobData,
  void,
  typeof NOTIFICATION_PUSH_RECEIPTS_JOB_NAME
>(
  NOTIFICATION_PUSH_RECEIPTS_QUEUE_NAME,
  async (job) => {
    await checkPushReceipts(job.data);
  },
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
    concurrency: 5,
  },
);

notificationPushReceiptsWorker.on("error", (error) => {
  console.error("Notification push receipts worker error", error);
});

notificationPushReceiptsWorker.on("failed", (job, error) => {
  console.error(
    `Notification push receipts job ${job?.id ?? "unknown"} failed`,
    error,
  );
});
