import { Context } from "grammy";
import { updateAndRenderTelegramState } from "../render-state.js";
import { getTelegramSession } from "../telegram-chat.js";

export const mainCommand = async (ctx: Context) => {
  try {
    const session = await getTelegramSession(ctx);
    if (!session) return;

    await updateAndRenderTelegramState({
      ctx,
      userId: session.userId,
      chat: session.chat,
      state: "HOME",
      metadata: null,
    });
  } catch (error) {
    console.error("Failed to return Telegram chat to main menu", error);
    await ctx.reply("Could not open the main menu. Please try again.");
  }
};
