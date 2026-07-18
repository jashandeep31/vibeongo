import { Bot } from "grammy";
import { env } from "../../lib/env.js";
import { db, eq, telegramBotChat, userSettings } from "@repo/db";
import { getCachedTelegramChat } from "../../cache/telegram-chat-cache.js";

const TELEGRAM_BOT_CHAT_STATES = [
  "HOME",
  "PROJECTS",
  "SELECTED_PROJECT",
  "NEW_SESSION",
] as const;

export const telegramBot = new Bot(env.TELEGRAM_BOT_TOKEN);

const commandsText = `
Available commands:
/projects — View all your projects
/back — Go back one step
/main — Return to the main menu
`;

telegramBot.command("projects", (ctx) => {
  ctx.reply("Here are your projects. Please choose one to continue.");
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

    switch (chat.state) {
      case "HOME":
        await ctx.reply(commandsText);
        break;

      case "PROJECTS":
        await ctx.reply("Choose a project to continue.");
        break;

      case "SELECTED_PROJECT":
        await ctx.reply("Your project is selected. What would you like to do next?");
        break;

      case "NEW_SESSION":
        await ctx.reply("Your new session is ready to begin.");
        break;
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
  const chat = await getCachedTelegramChat({ userId });
  if (chat) return chat as any;
  const [newchat] = await db
    .insert(telegramBotChat)
    .values({
      user_id: userId,
      state: "HOME",
    })
    .returning();
  return newchat as any;
};
