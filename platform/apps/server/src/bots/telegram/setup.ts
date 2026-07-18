import { Bot, InlineKeyboard } from "grammy";
import { env } from "../../lib/env.js";
import { db, eq, userSettings } from "@repo/db";

export const telegramBot = new Bot(env.TELEGRAM_BOT_TOKEN);
telegramBot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));

telegramBot.on("message", async (ctx) => {
  const [userSettingsRow] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.telegram_chat_id, ctx.chatId));

  if (!userSettingsRow) {
    await ctx.reply(
      `The chatId <code>${ctx.chatId}</code> is not registered with us.
Go to <a href="${env.FRONTEND_URL}/dashboard/settings">${env.FRONTEND_URL}/dashboard/settings</a>`,
      { parse_mode: "HTML" },
    );
    return;
  }
});
