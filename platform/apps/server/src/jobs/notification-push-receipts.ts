import { Queue } from "bullmq";
import { redis } from "../lib/valkey.js";

export const NOTIFICATION_PUSH_RECEIPTS_QUEUE_NAME = "notification-push-receipts";
export const NOTIFICATION_PUSH_RECEIPTS_JOB_NAME =
  "check-notification-push-receipts" as const;

// expo recommends reading receipts ~15 minutes after sending
export const PUSH_RECEIPTS_DELAY_MS = 15 * 60 * 1000;

export type PushReceiptTicket = {
  receiptId: string;
  token: string;
};

export type NotificationPushReceiptsJobData = {
  notificationId: string;
  tickets: PushReceiptTicket[];
  // receipts not ready yet are checked again, up to a limit
  check: number;
};

const notificationPushReceiptsQueue = new Queue<
  NotificationPushReceiptsJobData,
  void,
  typeof NOTIFICATION_PUSH_RECEIPTS_JOB_NAME
>(NOTIFICATION_PUSH_RECEIPTS_QUEUE_NAME, {
  connection: redis as any,
});

notificationPushReceiptsQueue.on("error", (error) => {
  console.error("Notification push receipts queue error", error);
});

export const addNotificationPushReceiptsJob = async ({
  notificationId,
  tickets,
  check = 1,
}: Omit<NotificationPushReceiptsJobData, "check"> & { check?: number }) => {
  return await notificationPushReceiptsQueue.add(
    NOTIFICATION_PUSH_RECEIPTS_JOB_NAME,
    { notificationId, tickets, check },
    {
      delay: PUSH_RECEIPTS_DELAY_MS,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 30_000,
      },
      removeOnComplete: true,
      removeOnFail: 500,
    },
  );
};
