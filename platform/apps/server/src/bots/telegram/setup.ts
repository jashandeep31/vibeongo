import { Bot } from "grammy";
import { env } from "../../lib/env.js";
import { db, eq, userSettings } from "@repo/db";
import { createOrGetTelegramChat } from "./telegram-chat.js";
import { projectsCommand } from "./commands/projects.js";
import { backCommand } from "./commands/back.js";
import { mainCommand } from "./commands/main.js";
import { projectSelectionCallback } from "./callbacks/project-selection.js";

export const telegramBot = new Bot(env.TELEGRAM_BOT_TOKEN);

const commandsText = `
Available commands:
/projects — View all your projects
/back — Go back one step
/main — Return to the main menu
`;

telegramBot.command("projects", projectsCommand);
telegramBot.command("back", backCommand);
telegramBot.command("main", mainCommand);
telegramBot.callbackQuery(/^project:(.+)$/, projectSelectionCallback);

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
