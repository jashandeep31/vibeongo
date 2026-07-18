import { Bot, InlineKeyboard } from "grammy";
import { env } from "../../lib/env.js";
import { and, db, eq, projects, telegramBotChat, userSettings } from "@repo/db";
import {
  getCachedTelegramChat,
  updateTelegramChat,
} from "../../cache/telegram-chat-cache.js";

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

telegramBot.command("projects", async (ctx) => {
  try {
    const [user] = await db
      .select({ user_id: userSettings.user_id })
      .from(userSettings)
      .where(eq(userSettings.telegram_chat_id, ctx.chatId));

    if (!user) {
      await ctx.reply("This Telegram chat is not registered with your account yet.");
      return;
    }

    const userProjects = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.user_id, user.user_id), eq(projects.deleted, false)));

    const chat = await createOrGetTelegramChat(user.user_id);
    if (!chat) {
      await ctx.reply("Something went wrong. Please try again.");
      return;
    }

    await updateTelegramChat({
      id: chat.id,
      state: "PROJECTS",
      metadata: chat.metadata,
    });

    if (userProjects.length === 0) {
      await ctx.reply("You do not have any projects yet.");
      return;
    }

    const keyboard = new InlineKeyboard();

    for (const project of userProjects) {
      keyboard.text(project.name, `project:${project.id}`).row();
    }

    await ctx.reply("Select a project:", { reply_markup: keyboard });
  } catch (error) {
    console.error("Failed to load Telegram projects", error);
    await ctx.reply("Could not load your projects. Please try again.");
  }
});

telegramBot.callbackQuery(/^project:(.+)$/, async (ctx) => {
  const projectId = ctx.match[1];
  const chatId = ctx.chatId;

  try {
    if (!projectId || chatId === undefined) {
      await ctx.answerCallbackQuery({ text: "Invalid project selection." });
      return;
    }

    const [user] = await db
      .select({ user_id: userSettings.user_id })
      .from(userSettings)
      .where(eq(userSettings.telegram_chat_id, chatId));

    if (!user) {
      await ctx.answerCallbackQuery({ text: "This chat is not registered." });
      return;
    }

    const [project] = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.user_id, user.user_id),
          eq(projects.deleted, false),
        ),
      );

    if (!project) {
      await ctx.answerCallbackQuery({ text: "Project not found." });
      return;
    }

    const chat = await createOrGetTelegramChat(user.user_id);
    if (!chat) {
      await ctx.answerCallbackQuery({ text: "Chat state could not be updated." });
      return;
    }

    const currentMetadata =
      chat.metadata && typeof chat.metadata === "object" ? chat.metadata : {};

    await updateTelegramChat({
      id: chat.id,
      state: "SELECTED_PROJECT",
      metadata: {
        ...currentMetadata,
        project_id: project.id,
      },
    });

    await ctx.answerCallbackQuery();
    await ctx.reply(`Selected project: ${project.name}\nID: ${project.id}`);
  } catch (error) {
    console.error("Failed to select Telegram project", error);
    await ctx.answerCallbackQuery({ text: "Could not select this project." });
  }
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
