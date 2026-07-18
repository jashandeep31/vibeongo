import { type CallbackQueryContext, Context } from "grammy";
import { and, db, eq, projects } from "@repo/db";
import { getUserIdByTelegramChatId } from "../../../cache/telegram-user-cache.js";
import { createOrGetTelegramChat } from "../telegram-chat.js";
import { updateAndRenderTelegramState } from "../render-state.js";

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

    const userId = await getUserIdByTelegramChatId(chatId);

    if (!userId) {
      await ctx.answerCallbackQuery({ text: "This chat is not registered." });
      return;
    }

    const [project] = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.user_id, userId),
          eq(projects.deleted, false),
        ),
      );

    if (!project) {
      await ctx.answerCallbackQuery({ text: "Project not found." });
      return;
    }

    const chat = await createOrGetTelegramChat(userId);
    if (!chat) {
      await ctx.answerCallbackQuery({ text: "Chat state could not be updated." });
      return;
    }

    await ctx.answerCallbackQuery();
    await updateAndRenderTelegramState({
      ctx,
      userId,
      chat,
      state: "SELECTED_PROJECT",
      metadata: { project_id: project.id },
    });
  } catch (error) {
    console.error("Failed to select Telegram project", error);
    await ctx
      .answerCallbackQuery({ text: "Could not select this project." })
      .catch(() => undefined);
  }
};
