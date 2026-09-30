import { Queue } from "bullmq";
import { redis } from "../lib/valkey.js";

export const NOTIFICATION_PUSH_QUEUE_NAME = "notification-push";
export const NOTIFICATION_PUSH_JOB_NAME = "send-notification-push" as const;

export type NotificationPushJobData = {
  notificationId: string;
};

const notificationPushQueue = new Queue<
  NotificationPushJobData,
  void,
  typeof NOTIFICATION_PUSH_JOB_NAME
>(NOTIFICATION_PUSH_QUEUE_NAME, {
  connection: redis as any,
});

notificationPushQueue.on("error", (error) => {
  console.error("Notification push queue error", error);
});

// runs at `pushAfter`: if the user has not read the notification in the app
// by then, it is sent as a push notification
export const addNotificationPushJob = async ({
  notificationId,
  pushAfter,
}: NotificationPushJobData & { pushAfter: Date }) => {
  return await notificationPushQueue.add(
    NOTIFICATION_PUSH_JOB_NAME,
    { notificationId },
    {
      jobId: `notification-push-${notificationId}`,
      delay: Math.max(0, pushAfter.getTime() - Date.now()),
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5_000,
      },
      removeOnComplete: true,
      removeOnFail: 500,
    },
  );
};
