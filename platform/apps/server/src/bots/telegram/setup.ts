import { Bot } from "grammy";
import { env } from "../../lib/env.js";
import { db, eq, telegramBotChat, userSettings } from "@repo/db";

const TELEGRAM_BOT_CHAT_STATES = [
  "HOME",
  "PROJECTS",
  "SELECTED_PROJECT",
  "NEW_SESSION",
] as const;

export const telegramBot = new Bot(env.TELEGRAM_BOT_TOKEN);

telegramBot.command("projects", (ctx) => {
  ctx.reply("HI will list the projects");
});

telegramBot.on("message", async (ctx) => {
  try {
    const [user] = await db
      .select({ user_id: userSettings.user_id })
      .from(userSettings)
      .where(eq(userSettings.telegram_chat_id, ctx.chatId));

    if (!user) {
      await ctx.reply(
        `The chatId <code>${ctx.chatId}</code> is not registered with us.
Go to <a href="${env.FRONTEND_URL}/dashboard/settings">${env.FRONTEND_URL}/dashboard/settings</a>`,
        { parse_mode: "HTML" },
      );
      return;
    }
    const userId = user.user_id;
    const chat = await createOrGetTelegramChat(userId);
    if (!chat) {
      ctx.reply("Something went wrong please retry!");
      return;
    }
    if (chat.state === "HOME") {
      ctx.reply("Run /projects to list all your projects");
    }
  } catch (e) {
    console.log(e);
  }
});

const createOrGetTelegramChat = async (
  userId: string,
): Promise<
  | (typeof telegramBotChat.$inferSelect & {
      state: (typeof TELEGRAM_BOT_CHAT_STATES)[number];
    })
  | undefined
> => {
  const [chat] = await db
    .select()
    .from(telegramBotChat)
    .where(eq(telegramBotChat.user_id, userId));

  if (chat) {
    return chat as any;
  }
  const [newchat] = await db
    .insert(telegramBotChat)
    .values({
      user_id: userId,
      state: "HOME",
    })
    .returning();
  return newchat as any;
};
