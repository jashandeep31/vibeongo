import { db, inArray, pushTokens } from "@repo/db";
import {
  addNotificationPushReceiptsJob,
  type NotificationPushReceiptsJobData,
  type PushReceiptTicket,
} from "../../jobs/notification-push-receipts.js";
import { expo } from "../../lib/expo-push.js";

// receipts not ready are checked again, then given up on
const MAX_RECEIPT_CHECKS = 3;

/**
 * Reads the delivery result from FCM/APNs for pushes Expo accepted earlier.
 * Deletes tokens of uninstalled apps and logs every other failure.
 */
export const checkPushReceipts = async ({
  notificationId,
  tickets,
  check,
}: NotificationPushReceiptsJobData) => {
  const ticketByReceiptId = new Map(
    tickets.map((ticket) => [ticket.receiptId, ticket]),
  );
  const notReady: PushReceiptTicket[] = [];
  const unregisteredTokens: string[] = [];

  for (const receiptIds of expo.chunkPushNotificationReceiptIds([
    ...ticketByReceiptId.keys(),
  ])) {
    const receipts = await expo.getPushNotificationReceiptsAsync(receiptIds);

    for (const receiptId of receiptIds) {
      const ticket = ticketByReceiptId.get(receiptId);
      if (!ticket) continue;

      const receipt = receipts[receiptId];
      if (!receipt) {
        notReady.push(ticket);
        continue;
      }
      if (receipt.status !== "error") continue;

      if (receipt.details?.error === "DeviceNotRegistered") {
        unregisteredTokens.push(ticket.token);
        continue;
      }
      // e.g. InvalidCredentials means the fcm/apns key on expo is wrong
      console.error(
        `Push notification ${notificationId} was not delivered: ${
          receipt.details?.error ?? "unknown"
        } - ${receipt.message}`,
      );
    }
  }

  // app was uninstalled from these devices
  if (unregisteredTokens.length) {
    await db
      .delete(pushTokens)
      .where(inArray(pushTokens.token, unregisteredTokens));
  }

  if (!notReady.length) return;
  if (check >= MAX_RECEIPT_CHECKS) {
    console.error(
      `Push receipts for notification ${notificationId} not ready after ${check} checks`,
    );
    return;
  }
  await addNotificationPushReceiptsJob({
    notificationId,
    tickets: notReady,
    check: check + 1,
  });
};
