import { Context } from "grammy";
import { updateAndRenderTelegramState } from "../render-state.js";
import { getTelegramSession } from "../telegram-chat.js";
import { createTelegramChatSession } from "../chat-session.js";

export const newSessionCommand = async (ctx: Context) => {
  try {
    const session = await getTelegramSession(ctx);
    if (!session) return;

    if (
      session.chat.state !== "SELECTED_PROJECT" ||
      !session.chat.metadata?.project_id
    ) {
      await ctx.reply("Select a project before starting a new session.");
      await updateAndRenderTelegramState({
        ctx,
        userId: session.userId,
        chat: session.chat,
        state: "PROJECTS",
        metadata: null,
      });
      return;
    }

    const chatSession = await createTelegramChatSession({
      telegramChatId: session.telegramChatId,
      userId: session.userId,
      projectId: session.chat.metadata.project_id,
    });

    if (!chatSession) {
      throw new Error("Failed to create Telegram chat session");
    }

    await updateAndRenderTelegramState({
      ctx,
      userId: session.userId,
      chat: session.chat,
      state: "NEW_SESSION_AI_CHAT",
      metadata: {
        ...session.chat.metadata,
        session_id: chatSession.id,
      },
    });
  } catch (error) {
    console.error("Failed to open Telegram new session", error);
    await ctx.reply("Could not open a new session. Please try again.");
  }
};
