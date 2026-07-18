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
import { createProjectSessionAgent } from "../../ai/ai-agents/create-session-agent.js";
import {
  getTelegramChatSessionMessages,
  saveTelegramChatSessionMessage,
} from "./chat-session.js";

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

    if (session.chat.state === "NEW_SESSION_AI_CHAT") {
      const message = ctx.message.text.trim();
      const projectId = session.chat.metadata?.project_id;
      const sessionId = session.chat.metadata?.session_id;
      if (!message) return;

      if (!projectId || !sessionId) {
        await ctx.reply("Select a project before starting a new session.");
        return;
      }

      const sessionMessages = await getTelegramChatSessionMessages(sessionId);
      await saveTelegramChatSessionMessage({
        sessionId,
        telegramChatId: session.telegramChatId,
        userId: session.userId,
        role: "user",
        text: message,
      });

      await ctx.replyWithStream(
        streamSessionResponse({
          sessionId,
          telegramChatId: session.telegramChatId,
          sessionMessages,
          message,
          projectId,
          userId: session.userId,
        }),
      );
      return;
    }

    await renderTelegramState(ctx, session.userId, session.chat);
  } catch (error) {
    console.error("Failed to render Telegram state", error);
    await ctx.reply("Something went wrong. Please try again.");
  }
});

async function* streamSessionResponse({
  sessionId,
  telegramChatId,
  sessionMessages,
  message,
  projectId,
  userId,
}: {
  sessionId: string;
  telegramChatId: number;
  sessionMessages: Awaited<ReturnType<typeof getTelegramChatSessionMessages>>;
  message: string;
  projectId: string;
  userId: string;
}): AsyncGenerator<string> {
  let hasText = false;
  let response = "";

  // sending the blank chunk to handle the delay from ai
  yield "\u200B";

  for await (const chunk of createProjectSessionAgent({
    sessionMessages,
    message,
    projectId,
    userId,
  })) {
    if (chunk.text) {
      hasText = true;
      response += chunk.text;
      yield chunk.text;
    }
  }

  if (!hasText) {
    response = "I couldn't generate a response for that. Please try again.";
    yield response;
  }

  await saveTelegramChatSessionMessage({
    sessionId,
    telegramChatId,
    userId,
    role: "bot",
    text: response,
  });
}
