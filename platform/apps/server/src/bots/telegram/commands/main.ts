import { type CommandContext, Context } from "grammy";
import { db, eq, userSettings } from "@repo/db";
import { updateTelegramChat } from "../../../cache/telegram-chat-cache.js";
import { createOrGetTelegramChat } from "../telegram-chat.js";

export const mainCommand = async (ctx: CommandContext<Context>) => {
  try {
    const [user] = await db
      .select({ user_id: userSettings.user_id })
      .from(userSettings)
      .where(eq(userSettings.telegram_chat_id, ctx.chatId));

    if (!user) {
      await ctx.reply("This Telegram chat is not registered with your account yet.");
      return;
    }

    const chat = await createOrGetTelegramChat(user.user_id);
    if (!chat) {
      await ctx.reply("Something went wrong. Please try again.");
      return;
    }

    await updateTelegramChat({
      id: chat.id,
      state: "HOME",
      metadata: {},
    });

    await ctx.reply("Main menu:\n\n/projects — View all your projects");
  } catch (error) {
    console.error("Failed to return Telegram chat to main menu", error);
    await ctx.reply("Could not open the main menu. Please try again.");
  }
};
