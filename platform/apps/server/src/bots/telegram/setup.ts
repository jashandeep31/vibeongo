import { Bot, type Context } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { stream, type StreamFlavor } from "@grammyjs/stream";
import { env } from "../../lib/env.js";
import { getTelegramSession } from "./telegram-chat.js";
import { projectsCommand } from "./commands/projects.js";
import { backCommand } from "./commands/back.js";
import { mainCommand } from "./commands/main.js";
import { newSessionCommand } from "./commands/new-session.js";
import { projectSelectionCallback } from "./callbacks/project-selection.js";
import { navigationCallback } from "./callbacks/navigation.js";
import { renderTelegramState } from "./render-state.js";

export type TelegramContext = StreamFlavor<Context>;

export const telegramBot = new Bot<TelegramContext>(env.TELEGRAM_BOT_TOKEN);

// Stream relies on message drafts, which can be rate limited by Telegram.
// Install automatic retries before the streaming middleware.
telegramBot.api.config.use(autoRetry());
telegramBot.use(stream());

telegramBot.command("projects", projectsCommand);
telegramBot.command("back", backCommand);
telegramBot.command("main", mainCommand);
telegramBot.command("newsession", newSessionCommand);
telegramBot.callbackQuery(/^project:(.+)$/, projectSelectionCallback);
telegramBot.callbackQuery(
  /^nav:(projects|back|main|new_session)$/,
  navigationCallback,
);

telegramBot.on("message:text", async (ctx) => {
  try {
    const session = await getTelegramSession(ctx);
    if (!session) return;

    await renderTelegramState(ctx, session.userId, session.chat);
  } catch (error) {
    console.error("Failed to render Telegram state", error);
    await ctx.reply("Something went wrong. Please try again.");
  }
});
