import { getRefinedTaskFromUserIssuesCommentSystemPrompt } from "./get-refined-task-from-user-issues-comment-system-prompt.js";
import { getSessionNameAndDescriptionSystemPrompt } from "./get-session-name-and-description-system-prompt.js";

export const prompts = {
  getRefinedTaskFromUserIssuesComment: {
    systemPrompt: getRefinedTaskFromUserIssuesCommentSystemPrompt,
  },
  getSessionNameAndDescription: {
    systemPrompt: getSessionNameAndDescriptionSystemPrompt,
  },
} as const;
