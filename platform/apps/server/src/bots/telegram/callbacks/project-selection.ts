import { type CallbackQueryContext, Context } from "grammy";
import { and, db, eq, projects, userSettings } from "@repo/db";
import { updateTelegramChat } from "../../../cache/telegram-chat-cache.js";
import { createOrGetTelegramChat } from "../telegram-chat.js";

export const projectSelectionCallback = async (
  ctx: CallbackQueryContext<Context>,
) => {
  const projectId = ctx.match[1];
  const chatId = ctx.chatId;

  try {
    if (!projectId || chatId === undefined) {
      await ctx.answerCallbackQuery({ text: "Invalid project selection." });
      return;
    }

    const [user] = await db
      .select({ user_id: userSettings.user_id })
      .from(userSettings)
      .where(eq(userSettings.telegram_chat_id, chatId));

    if (!user) {
      await ctx.answerCallbackQuery({ text: "This chat is not registered." });
      return;
    }

    const [project] = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.user_id, user.user_id),
          eq(projects.deleted, false),
        ),
      );

    if (!project) {
      await ctx.answerCallbackQuery({ text: "Project not found." });
      return;
    }

    const chat = await createOrGetTelegramChat(user.user_id);
    if (!chat) {
      await ctx.answerCallbackQuery({ text: "Chat state could not be updated." });
      return;
    }

    const currentMetadata =
      chat.metadata && typeof chat.metadata === "object" ? chat.metadata : {};

    await updateTelegramChat({
      id: chat.id,
      state: "SELECTED_PROJECT",
      metadata: { ...currentMetadata, project_id: project.id },
    });

    await ctx.answerCallbackQuery();
    await ctx.reply(`Selected project: ${project.name}\nID: ${project.id}`);
  } catch (error) {
    console.error("Failed to select Telegram project", error);
    await ctx.answerCallbackQuery({ text: "Could not select this project." });
  }
};
