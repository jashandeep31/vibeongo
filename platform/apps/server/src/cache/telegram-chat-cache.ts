import { db, telegramBotChat, eq } from "@repo/db";
import { redis } from "../lib/valkey.js";

const getKey = (userId: string) => `TELEGRAM_BOT_CHAT:${userId}`;

export const getCachedTelegramChat = async ({
  userId,
}: {
  userId: string;
}): Promise<typeof telegramBotChat.$inferSelect | undefined> => {
  try {
    const cached = await redis.get(getKey(userId));
    if (cached) {
      return cached === "null" ? undefined : JSON.parse(cached);
    }
  } catch (err) {
    console.error("Redis get failed, falling back to DB", err);
  }

  const [chat] = await db
    .select()
    .from(telegramBotChat)
    .where(eq(telegramBotChat.user_id, userId));

  try {
    if (chat) {
      await redis.set(
        getKey(userId),
        chat ? JSON.stringify(chat) : "null",
        "EX",
        60 * 5,
      );
    }
  } catch (err) {
    console.error("Redis set failed", err);
  }

  return chat;
};
