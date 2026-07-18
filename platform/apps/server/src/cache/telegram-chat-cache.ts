import { db, telegramBotChat, eq } from "@repo/db";
import { redis } from "../lib/valkey.js";

const getKey = (userId: string) => `TELEGRAM_BOT_CHAT:${userId}`;

export const setCachedTelegramChat = async ({
  userId,
  chat,
}: {
  userId: string;
  chat: typeof telegramBotChat.$inferSelect;
}) => {
  try {
    await redis.set(getKey(userId), JSON.stringify(chat), "EX", 60 * 5);
  } catch (err) {
    console.error("Redis set failed", err);
  }
};

export const updateTelegramChat = async ({
  id,
  state,
  metadata,
}: {
  id: string;
  state: string;
  metadata: unknown;
}) => {
  const [chat] = await db
    .update(telegramBotChat)
    .set({ state, metadata, updated_at: new Date() })
    .where(eq(telegramBotChat.id, id))
    .returning();

  if (chat) {
    await setCachedTelegramChat({ userId: chat.user_id, chat });
  }

  return chat;
};

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
