import { InlineKeyboard, type CommandContext, Context } from "grammy";
import { and, db, eq, projects, userSettings } from "@repo/db";
import { updateTelegramChat } from "../../../cache/telegram-chat-cache.js";
import { createOrGetTelegramChat } from "../telegram-chat.js";

export const projectsCommand = async (ctx: CommandContext<Context>) => {
  try {
    const [user] = await db
      .select({ user_id: userSettings.user_id })
      .from(userSettings)
      .where(eq(userSettings.telegram_chat_id, ctx.chatId));

    if (!user) {
      await ctx.reply("This Telegram chat is not registered with your account yet.");
      return;
    }

    const userProjects = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.user_id, user.user_id), eq(projects.deleted, false)));

    const chat = await createOrGetTelegramChat(user.user_id);
    if (!chat) {
      await ctx.reply("Something went wrong. Please try again.");
      return;
    }

    await updateTelegramChat({
      id: chat.id,
      state: "PROJECTS",
      metadata: chat.metadata,
    });

    if (userProjects.length === 0) {
      await ctx.reply("You do not have any projects yet.");
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const project of userProjects) {
      keyboard.text(project.name, `project:${project.id}`).row();
    }

    await ctx.reply("Select a project:", { reply_markup: keyboard });
  } catch (error) {
    console.error("Failed to load Telegram projects", error);
    await ctx.reply("Could not load your projects. Please try again.");
  }
};
