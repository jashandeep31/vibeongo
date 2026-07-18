import { Context } from "grammy";
import { updateAndRenderTelegramState } from "../render-state.js";
import { getTelegramSession } from "../telegram-chat.js";

export const projectsCommand = async (ctx: Context) => {
  try {
    const session = await getTelegramSession(ctx);
    if (!session) return;

    await updateAndRenderTelegramState({
      ctx,
      userId: session.userId,
      chat: session.chat,
      state: "PROJECTS",
      metadata: null,
    });
  } catch (error) {
    console.error("Failed to load Telegram projects", error);
    await ctx.reply("Could not load your projects. Please try again.");
  }
};
