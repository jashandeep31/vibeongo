import { aiModels, googleAiClient } from "../config.js";
import { prompts } from "../prompts/index.js";

// --- Gets the raw message and convert it to refined message to get passed to the opencode run command ---
export const getRefinedTaskFromUserIssuesComment = async (comment: string) => {
  const res = await googleAiClient.models.generateContent({
    model: aiModels["google-large-model"].name,
    config: {
      systemInstruction:
        prompts.getRefinedTaskFromUserIssuesComment.systemPrompt(),
    },
    contents: comment,
  });
  return res.text!;
};
