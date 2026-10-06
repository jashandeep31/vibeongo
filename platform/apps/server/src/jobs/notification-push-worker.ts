import { Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import { sendPushNotification } from "../services/notifications/send-push-notification.js";
import {
  NOTIFICATION_PUSH_JOB_NAME,
  NOTIFICATION_PUSH_QUEUE_NAME,
  type NotificationPushJobData,
} from "./notification-push.js";

export const notificationPushWorker = new Worker<
  NotificationPushJobData,
  void,
  typeof NOTIFICATION_PUSH_JOB_NAME
>(
  NOTIFICATION_PUSH_QUEUE_NAME,
  async (job) => {
    await sendPushNotification(job.data.notificationId);
  },
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
    concurrency: 10,
  },
);

notificationPushWorker.on("error", (error) => {
  console.error("Notification push worker error", error);
});

notificationPushWorker.on("failed", (job, error) => {
  console.error(
    `Notification push job ${job?.id ?? "unknown"} failed`,
    error,
  );
});
