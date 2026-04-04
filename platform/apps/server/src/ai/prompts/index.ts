import { getRefinedTaskFromUserIssuesCommentSystemPrompt } from "./get-refined-task-from-user-issues-comment-system-prompt.js";

export const prompts = {
  getRefinedTaskFromUserIssuesComment: {
    systemPrompt: getRefinedTaskFromUserIssuesCommentSystemPrompt,
  },
} as const;
