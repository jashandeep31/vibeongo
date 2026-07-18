import { type CallbackQueryContext, Context } from "grammy";
import { backCommand } from "../commands/back.js";
import { mainCommand } from "../commands/main.js";
import { newSessionCommand } from "../commands/new-session.js";
import { projectsCommand } from "../commands/projects.js";

export const navigationCallback = async (
  ctx: CallbackQueryContext<Context>,
) => {
  const action = ctx.match[1];
  await ctx.answerCallbackQuery();

  switch (action) {
    case "projects":
      await projectsCommand(ctx);
      break;
    case "back":
      await backCommand(ctx);
      break;
    case "main":
      await mainCommand(ctx);
      break;
    case "new_session":
      await newSessionCommand(ctx);
      break;
  }
};
