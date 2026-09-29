import { and, db, eq, notifications, type Transaction } from "@repo/db";
import { addNotificationPushJob } from "../../jobs/notification-push.js";
import { sendToUser } from "../../websocket/user-sockets-store.js";

// if the user does not read it within this time, fallback to push notification
const PUSH_FALLBACK_DELAY_MS = 60_000;

type Notification = typeof notifications.$inferSelect;

// sends the notification to the user's open sockets, if any, and schedules
// the push fallback in case the user does not read it in the app
export const deliverNotification = async (notification: Notification) => {
  await addNotificationPushJob({
    notificationId: notification.id,
    pushAfter: notification.push_after,
  });

  const sent = sendToUser(notification.user_id, {
    type: "notification",
    data: notification,
  });
  if (!sent) return;

  await db
    .update(notifications)
    .set({ status: "sent_ws", updated_at: new Date() })
    .where(
      and(
        eq(notifications.id, notification.id),
        eq(notifications.status, "queued"),
      ),
    );
};

/**
 * Creates a notification and delivers it over websocket.
 * When a `tx` is passed, delivery is skipped: call `deliverNotification`
 * after the transaction commits, so the client never sees an uncommitted row.
 */
export const createNotification = async ({
  tx,
  userId,
  type,
  title,
  body,
  payload,
  pushDelayMs = PUSH_FALLBACK_DELAY_MS,
}: {
  tx?: Transaction;
  userId: string;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
  pushDelayMs?: number;
}) => {
  const [notification] = await (tx ?? db)
    .insert(notifications)
    .values({
      user_id: userId,
      type,
      title,
      body,
      payload,
      push_after: new Date(Date.now() + pushDelayMs),
    })
    .returning();

  if (!notification) throw new Error("Notification was not created");

  if (!tx) await deliverNotification(notification);

  return notification;
};
