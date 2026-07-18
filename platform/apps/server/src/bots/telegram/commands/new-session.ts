import { Context } from "grammy";
import { updateAndRenderTelegramState } from "../render-state.js";
import { getTelegramSession } from "../telegram-chat.js";

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

    await updateAndRenderTelegramState({
      ctx,
      userId: session.userId,
      chat: session.chat,
      state: "NEW_SESSION_AI_CHAT",
      metadata: session.chat.metadata,
    });
  } catch (error) {
    console.error("Failed to open Telegram new session", error);
    await ctx.reply("Could not open a new session. Please try again.");
  }
};
