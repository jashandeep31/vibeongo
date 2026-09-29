import { db, notifications, type Transaction } from "@repo/db";

// if the client does not ack within this time, fallback to push notification
const PUSH_FALLBACK_DELAY_MS = 60_000;

export const createNotification = async ({
  tx = db,
  userId,
  type,
  title,
  body,
  payload,
  pushDelayMs = PUSH_FALLBACK_DELAY_MS,
}: {
  tx?: Transaction | typeof db;
  userId: string;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
  pushDelayMs?: number;
}) => {
  const [notification] = await tx
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

  return notification;
};
