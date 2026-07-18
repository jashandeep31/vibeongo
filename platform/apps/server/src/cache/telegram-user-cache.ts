import { db, eq, userSettings } from "@repo/db";
import { redis } from "../lib/valkey.js";

const getKey = (telegramChatId: number) =>
  `TELEGRAM_USER_ID:${telegramChatId}`;

export const getUserIdByTelegramChatId = async (
  telegramChatId: number,
): Promise<string | undefined> => {
  const key = getKey(telegramChatId);

  try {
    const cachedUserId = await redis.get(key);
    if (cachedUserId) {
      return cachedUserId === "null" ? undefined : cachedUserId;
    }
  } catch (error) {
    console.error("Redis get failed, falling back to user settings", error);
  }

  const [user] = await db
    .select({ userId: userSettings.user_id })
    .from(userSettings)
    .where(eq(userSettings.telegram_chat_id, telegramChatId));

  try {
    await redis.set(key, user?.userId ?? "null", "EX", 60 * 5);
  } catch (error) {
    console.error("Redis set failed", error);
  }

  return user?.userId;
};
