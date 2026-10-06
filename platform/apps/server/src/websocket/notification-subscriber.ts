import { and, db, eq, notifications } from "@repo/db";
import { redis } from "../lib/valkey.js";
import {
  NOTIFICATION_CHANNEL,
  type Notification,
} from "../services/notifications/create-notification.js";
import { sendToUser } from "./user-sockets-store.js";

// Runs in every api process: notifications can be created in any process,
// but only the process holding the user's websocket can send it.
export const startNotificationSubscriber = async () => {
  // a subscribed connection can't run other commands, so it gets its own
  const subscriber = redis.duplicate();

  subscriber.on("error", (error) => {
    console.error("Notification subscriber error", error);
  });

  subscriber.on("message", async (_channel, message) => {
    try {
      const notification = JSON.parse(message) as Notification;

      const sent = sendToUser(notification.user_id, {
        type: "notification",
        data: notification,
      });
      // this process does not hold any of the user's sockets
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
    } catch (error) {
      console.error("Could not deliver notification over websocket", error);
    }
  });

  await subscriber.subscribe(NOTIFICATION_CHANNEL);
};
