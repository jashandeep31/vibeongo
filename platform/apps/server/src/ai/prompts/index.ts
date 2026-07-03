import { cwd } from "node:process";
import { createProjetSystemPrompt } from "./create-project-prompt-system.js";
import { getRefinedTaskFromUserIssuesCommentSystemPrompt } from "./get-refined-task-from-user-issues-comment-system-prompt.js";
import path from "node:path";
import {
  getChatNameSystemPrompt,
  getSessionNameAndDescriptionSystemPrompt,
} from "./common-system-prompt.js";

export const PROMPT_TEXT_FILES_FOLDER_PATH = path.resolve(cwd(), "prompts");

export const prompts = {
  getRefinedTaskFromUserIssuesComment: {
    systemPrompt: getRefinedTaskFromUserIssuesCommentSystemPrompt,
  },
  getSessionNameAndDescription: {
    systemPrompt: getSessionNameAndDescriptionSystemPrompt,
  },
  createProject: {
    systemPrompt: createProjetSystemPrompt,
  },
  newChatName: {
    systemPrompt: getChatNameSystemPrompt,
  },
} as const;
