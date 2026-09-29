import {
  and,
  db,
  eq,
  inArray,
  notifications,
  pushTokens,
} from "@repo/db";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import {
  addNotificationPushReceiptsJob,
  type PushReceiptTicket,
} from "../../jobs/notification-push-receipts.js";
import { expo } from "../../lib/expo-push.js";

/**
 * Sends a notification as a push to every enabled device of the user,
 * unless the user already read it in the app.
 */
export const sendPushNotification = async (notificationId: string) => {
  const [notification] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1);

  if (!notification) return;
  // seen in the app, or already pushed by a previous attempt
  if (["delivered", "read", "pushed"].includes(notification.status)) return;

  const tokens = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(
      and(
        eq(pushTokens.user_id, notification.user_id),
        eq(pushTokens.enabled, true),
      ),
    );

  const messages: ExpoPushMessage[] = tokens
    .filter(({ token }) => Expo.isExpoPushToken(token))
    .map(({ token }) => ({
      to: token,
      title: notification.title,
      ...(notification.body ? { body: notification.body } : {}),
      data: {
        ...(notification.payload as Record<string, unknown> | null),
        notificationId: notification.id,
        type: notification.type,
      },
      sound: "default",
      priority: "high",
      // matches the channel created by the mobile app
      channelId: "default",
    }));

  // no device to push to, it stays unread in the app
  if (!messages.length) return;

  const unregisteredTokens: string[] = [];
  // accepted by expo, the final result from fcm/apns is read later
  const acceptedTickets: PushReceiptTicket[] = [];
  for (const chunk of expo.chunkPushNotifications(messages)) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);

    tickets.forEach((ticket, index) => {
      const token = chunk[index]?.to;
      if (ticket.status === "ok") {
        if (typeof token === "string") {
          acceptedTickets.push({ receiptId: ticket.id, token });
        }
        return;
      }

      if (
        ticket.details?.error === "DeviceNotRegistered" &&
        typeof token === "string"
      ) {
        unregisteredTokens.push(token);
        return;
      }
      console.error(
        `Push notification ${notification.id} failed: ${ticket.message}`,
      );
    });
  }

  // app was uninstalled from these devices
  if (unregisteredTokens.length) {
    await db
      .delete(pushTokens)
      .where(inArray(pushTokens.token, unregisteredTokens));
  }

  if (acceptedTickets.length) {
    await addNotificationPushReceiptsJob({
      notificationId: notification.id,
      tickets: acceptedTickets,
    });
  }

  const now = new Date();
  await db
    .update(notifications)
    .set({ status: "pushed", pushed_at: now, updated_at: now })
    .where(
      and(
        eq(notifications.id, notification.id),
        inArray(notifications.status, ["queued", "sent_ws"]),
      ),
    );
};
