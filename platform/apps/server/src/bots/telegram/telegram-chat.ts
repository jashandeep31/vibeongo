import { db, telegramBotChat } from "@repo/db";
import { getCachedTelegramChat } from "../../cache/telegram-chat-cache.js";

export const TELEGRAM_BOT_CHAT_STATES = [
  "HOME",
  "PROJECTS",
  "SELECTED_PROJECT",
  "NEW_SESSION",
] as const;

export const createOrGetTelegramChat = async (userId: string) => {
  const chat = await getCachedTelegramChat({ userId });
  if (chat) return chat as any;

  const [newChat] = await db
    .insert(telegramBotChat)
    .values({ user_id: userId, state: "HOME" })
    .returning();

  return newChat as any;
};
