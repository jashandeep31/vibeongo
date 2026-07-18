import { Context } from "grammy";
import { updateAndRenderTelegramState } from "../render-state.js";
import { getTelegramSession } from "../telegram-chat.js";
import type {
  TelegramBotChatMetadata,
  TelegramBotChatState,
} from "../types.js";

export const backCommand = async (ctx: Context) => {
  try {
    const session = await getTelegramSession(ctx);
    if (!session) return;

    let state: TelegramBotChatState;
    let metadata: TelegramBotChatMetadata | null;

    switch (session.chat.state) {
      case "HOME":
        state = "HOME";
        metadata = null;
        break;
      case "PROJECTS":
        state = "HOME";
        metadata = null;
        break;
      case "SELECTED_PROJECT":
        state = "PROJECTS";
        metadata = null;
        break;
      case "NEW_SESSION":
      case "NEW_SESSION_AI_CHAT":
        state = "SELECTED_PROJECT";
        metadata = session.chat.metadata;
        break;
    }

    await updateAndRenderTelegramState({
      ctx,
      userId: session.userId,
      chat: session.chat,
      state,
      metadata,
    });
  } catch (error) {
    console.error("Failed to move Telegram chat back", error);
    await ctx.reply("Could not go back. Please try again.");
  }
};
