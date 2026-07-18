import { and, db, eq, projects } from "@repo/db";
import { Context, InlineKeyboard } from "grammy";
import { updateTelegramChat } from "../../cache/telegram-chat-cache.js";
import { toTelegramBotChat } from "./telegram-chat.js";
import type {
  TelegramBotChat,
  TelegramBotChatMetadata,
  TelegramBotChatState,
} from "./types.js";

const navigationKeyboard = (includeBack = true) => {
  const keyboard = new InlineKeyboard();
  if (includeBack) keyboard.text("⬅️ Back", "nav:back");
  keyboard.text("🏠 Main", "nav:main");
  return keyboard;
};

export const renderTelegramState = async (
  ctx: Context,
  userId: string,
  chat: TelegramBotChat,
) => {
  switch (chat.state) {
    case "HOME":
      await ctx.reply("Main menu:\n\nChoose what you would like to do.", {
        reply_markup: new InlineKeyboard().text(
          "📁 View projects",
          "nav:projects",
        ),
      });
      return;

    case "PROJECTS": {
      const userProjects = await db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(and(eq(projects.user_id, userId), eq(projects.deleted, false)));

      const keyboard = new InlineKeyboard();
      for (const project of userProjects) {
        keyboard.text(`📁 ${project.name}`, `project:${project.id}`).row();
      }
      keyboard.text("⬅️ Back", "nav:back").text("🏠 Main", "nav:main");

      await ctx.reply(
        userProjects.length > 0
          ? "Select a project:"
          : "You do not have any projects yet.",
        { reply_markup: keyboard },
      );
      return;
    }

    case "SELECTED_PROJECT": {
      const projectId = chat.metadata?.project_id;
      const [project] = projectId
        ? await db
            .select({ id: projects.id, name: projects.name })
            .from(projects)
            .where(
              and(
                eq(projects.id, projectId),
                eq(projects.user_id, userId),
                eq(projects.deleted, false),
              ),
            )
        : [];

      if (!project) {
        await ctx.reply(
          "The selected project is unavailable. Go back and choose another project.",
          { reply_markup: navigationKeyboard() },
        );
        return;
      }

      const keyboard = new InlineKeyboard()
        .text("➕ New session", "nav:new_session")
        .row()
        .text("⬅️ Back", "nav:back")
        .text("🏠 Main", "nav:main");

      await ctx.reply(`Selected project: ${project.name}`, {
        reply_markup: keyboard,
      });
      return;
    }

    case "NEW_SESSION":
      await ctx.reply(
        "New session setup will be available here. Choose an option below.",
        { reply_markup: navigationKeyboard() },
      );
  }
};

export const updateAndRenderTelegramState = async ({
  ctx,
  userId,
  chat,
  state,
  metadata,
}: {
  ctx: Context;
  userId: string;
  chat: TelegramBotChat;
  state: TelegramBotChatState;
  metadata: TelegramBotChatMetadata | null;
}) => {
  const updatedChat = await updateTelegramChat({
    id: chat.id,
    state,
    metadata,
  });

  if (!updatedChat) {
    await ctx.reply("Chat state could not be updated. Please try again.");
    return;
  }

  await renderTelegramState(ctx, userId, toTelegramBotChat(updatedChat));
};
