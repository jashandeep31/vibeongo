import { type CommandContext, Context } from "grammy";
import { db, eq, userSettings } from "@repo/db";
import { updateTelegramChat } from "../../../cache/telegram-chat-cache.js";
import { createOrGetTelegramChat } from "../telegram-chat.js";

export const backCommand = async (ctx: CommandContext<Context>) => {
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

    let state: string;
    let metadata: unknown;
    let message: string;

    switch (chat.state) {
      case "HOME":
        state = "HOME";
        metadata = {};
        message = "You are already at the main menu.";
        break;
      case "PROJECTS":
        state = "HOME";
        metadata = {};
        message = "Returned to the main menu.";
        break;
      case "SELECTED_PROJECT":
        state = "PROJECTS";
        metadata = {};
        message = "Returned to your project list.";
        break;
      case "NEW_SESSION":
        state = "SELECTED_PROJECT";
        metadata = chat.metadata;
        message = "Returned to the selected project.";
        break;
      default:
        state = "HOME";
        metadata = {};
        message = "Returned to the main menu.";
    }

    await updateTelegramChat({ id: chat.id, state, metadata });
    await ctx.reply(message);
  } catch (error) {
    console.error("Failed to move Telegram chat back", error);
    await ctx.reply("Could not go back. Please try again.");
  }
};
