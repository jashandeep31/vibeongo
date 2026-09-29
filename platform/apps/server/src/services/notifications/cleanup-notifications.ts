import { and, db, isNotNull, lt, notifications, pushTokens } from "@repo/db";

const DAY_MS = 24 * 60 * 60 * 1000;
// app not opened on the device for this long, the token is likely dead
const STALE_PUSH_TOKEN_DAYS = 60;
const READ_NOTIFICATION_RETENTION_DAYS = 30;
// unread ones are kept longer, but not forever
const NOTIFICATION_RETENTION_DAYS = 90;

export const cleanupNotifications = async () => {
  const now = Date.now();

  const deletedTokens = await db
    .delete(pushTokens)
    .where(
      lt(
        pushTokens.last_seen_at,
        new Date(now - STALE_PUSH_TOKEN_DAYS * DAY_MS),
      ),
    )
    .returning({ id: pushTokens.id });

  const deletedReadNotifications = await db
    .delete(notifications)
    .where(
      and(
        isNotNull(notifications.read_at),
        lt(
          notifications.read_at,
          new Date(now - READ_NOTIFICATION_RETENTION_DAYS * DAY_MS),
        ),
      ),
    )
    .returning({ id: notifications.id });

  const deletedOldNotifications = await db
    .delete(notifications)
    .where(
      lt(
        notifications.created_at,
        new Date(now - NOTIFICATION_RETENTION_DAYS * DAY_MS),
      ),
    )
    .returning({ id: notifications.id });

  return {
    pushTokens: deletedTokens.length,
    notifications:
      deletedReadNotifications.length + deletedOldNotifications.length,
  };
};
