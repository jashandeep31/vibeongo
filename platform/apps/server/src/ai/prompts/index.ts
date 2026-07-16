import { cwd } from "node:process";
import { createProjetSystemPrompt } from "./create-project-prompt-system.js";
import path from "node:path";
import {
  getChatNameSystemPrompt,
  getSessionNameAndDescriptionSystemPrompt,
} from "./common-system-prompt.js";
import { createTasksForPRIssueOrCommaentSystemPrompt } from "./create-tasks-for-pr-issue-or-comment-system-prompt.js";

export const PROMPT_TEXT_FILES_FOLDER_PATH = path.resolve(cwd(), "prompts");

export const prompts = {
  getSessionNameAndDescription: {
    systemPrompt: getSessionNameAndDescriptionSystemPrompt,
  },
  createProject: {
    systemPrompt: createProjetSystemPrompt,
  },
  newChatName: {
    systemPrompt: getChatNameSystemPrompt,
  },
  createTasksForPRIssueOrCommentAgent: {
    systemPrompt: createTasksForPRIssueOrCommaentSystemPrompt,
  },
} as const;
