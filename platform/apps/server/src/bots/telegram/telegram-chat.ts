import { db, telegramBotChat } from "@repo/db";
import { Context } from "grammy";
import { getCachedTelegramChat } from "../../cache/telegram-chat-cache.js";
import { getUserIdByTelegramChatId } from "../../cache/telegram-user-cache.js";
import { env } from "../../lib/env.js";
import {
  TELEGRAM_BOT_CHAT_STATES,
  type TelegramBotChat,
} from "./types.js";

export const toTelegramBotChat = (
  chat: typeof telegramBotChat.$inferSelect,
): TelegramBotChat => ({
  ...chat,
  state: TELEGRAM_BOT_CHAT_STATES.includes(chat.state as any)
    ? (chat.state as TelegramBotChat["state"])
    : "HOME",
  metadata:
    chat.metadata && typeof chat.metadata === "object"
      ? (chat.metadata as TelegramBotChat["metadata"])
      : null,
});

export const createOrGetTelegramChat = async (
  userId: string,
): Promise<TelegramBotChat | undefined> => {
  const chat = await getCachedTelegramChat({ userId });
  if (chat) return toTelegramBotChat(chat);

  const [newChat] = await db
    .insert(telegramBotChat)
    .values({ user_id: userId, state: "HOME" })
    .returning();

  return newChat ? toTelegramBotChat(newChat) : undefined;
};

export const getTelegramSession = async (ctx: Context) => {
  if (ctx.chatId === undefined) return;

  const userId = await getUserIdByTelegramChatId(ctx.chatId);
  if (!userId) {
    await ctx.reply(
      `The chat ID <code>${ctx.chatId}</code> is not registered with us.
Go to <a href="${env.FRONTEND_URL}/dashboard/settings">your settings</a> to connect it.`,
      { parse_mode: "HTML" },
    );
    return;
  }

  const chat = await createOrGetTelegramChat(userId);
  if (!chat) {
    await ctx.reply("Something went wrong. Please try again.");
    return;
  }

  return { userId, chat, telegramChatId: ctx.chatId };
};
