import { generateText, Output } from "ai";
import "../../lib/env.js";
import { prompts } from "../prompts/index.js";
import { z } from "zod";

export const getSessionNameAndDescriptionAgent = async (
  body: string,
): Promise<string> => {
  const res = await generateText({
    model: "zai/glm-5.2",
    system: prompts.getSessionNameAndDescription.systemPrompt(),
    reasoning: "high",
    prompt: body,
  });
  return res.text;
};

export const getChatName = async (body: string): Promise<string> => {
  try {
    const res = await generateText({
      model: "openai/gpt-5-mini",
      system: prompts.newChatName.systemPrompt(),
      prompt: body,
      output: Output.object({
        schema: z.object({
          name: z.string().describe("Short chat session name"),
        }),
      }),
    });
    return res.output.name;
  } catch {
    return "chat";
  }
};
