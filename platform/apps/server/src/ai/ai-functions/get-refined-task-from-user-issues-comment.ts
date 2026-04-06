import { Type } from "@google/genai";
import { aiModels, googleAiClient } from "../config.js";
import { prompts } from "../prompts/index.js";
import { getRefinedTaskFromUserIssuesCommentSystemPrompt } from "../prompts/get-refined-task-from-user-issues-comment-system-prompt.js";

// --- Gets the raw message and convert it to refined message to get passed to the opencode run command ---
export const getRefinedTaskFromUserIssuesComment = async (comment: string) => {
  const res = await googleAiClient.models.generateContent({
    model: aiModels["google-large-model"].name,
    config: {
      systemInstruction:
        prompts.getRefinedTaskFromUserIssuesComment.systemPrompt(),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["tasks"],
        properties: {
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
          },
        },
      },
    },
    contents: comment,
  });

  return res.text!;
};
