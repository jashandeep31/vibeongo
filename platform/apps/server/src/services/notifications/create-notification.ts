import { db, notifications } from "@repo/db";
import { addNotificationPushJob } from "../../jobs/notification-push.js";
import { redis } from "../../lib/valkey.js";
import { isUserOnline } from "../../websocket/user-presence.js";

// user has an open app or web tab: it gets the notification over the
// websocket and marks it read when shown, the push only goes out if that
// did not happen by then (e.g. hidden tab, app just sent to background)
const ONLINE_PUSH_DELAY_MS = 10_000;

// no open socket: nothing else will reach the user, push right away
const pushDelayFor = async (userId: string) => {
  try {
    return (await isUserOnline(userId)) ? ONLINE_PUSH_DELAY_MS : 0;
  } catch (error) {
    // unknown: wait, so an in-app delivery is not doubled by a push
    console.error(`Could not check if user ${userId} is online`, error);
    return ONLINE_PUSH_DELAY_MS;
  }
};

// valkey pub/sub channel: the api process that holds the user's websocket
// delivers it (see websocket/notification-subscriber.ts)
export const NOTIFICATION_CHANNEL = "notifications";

export type Notification = typeof notifications.$inferSelect;

// schedules the push fallback and publishes the notification for realtime
// delivery; works from any process (api or background worker)
const deliverNotification = async (notification: Notification) => {
  await addNotificationPushJob({
    notificationId: notification.id,
    pushAfter: notification.push_after,
  });

  try {
    await redis.publish(NOTIFICATION_CHANNEL, JSON.stringify(notification));
  } catch (error) {
    // the push fallback still delivers it
    console.error(
      `Could not publish notification ${notification.id} for realtime delivery`,
      error,
    );
  }
};

/**
 * Creates a notification and delivers it: in-app over websocket, and as a
 * push if the user has not seen it by `push_after`. Call it after the
 * event is committed, never inside a transaction.
 */
export const createNotification = async ({
  userId,
  type,
  title,
  body,
  payload,
  pushDelayMs,
}: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
  // overrides the delay picked from the user's presence
  pushDelayMs?: number;
}) => {
  pushDelayMs ??= await pushDelayFor(userId);

  const [notification] = await db
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

  await deliverNotification(notification);

  return notification;
};
