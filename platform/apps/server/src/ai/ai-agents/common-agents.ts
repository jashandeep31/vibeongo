import { generateText, Output } from "ai";
import "../../lib/env.js";
import { prompts } from "../prompts/index.js";
import { z } from "zod";

export const getSessionNameAndDescriptionAgent = async (
  body: string,
): Promise<{
  name: string;
  description: string;
}> => {
  try {
    const res = await generateText({
      model: "openai/gpt-5-mini",
      system: prompts.getSessionNameAndDescription.systemPrompt(),
      reasoning: "high",
      prompt: body,
      output: Output.object({
        schema: z.object({
          name: z.string().describe("Short name"),
          description: z.string().describe("Short description"),
        }),
      }),
    });

    return {
      name: res.output.name || "New Session",
      description: res.output.description || "",
    };
  } catch {
    return {
      name: "New Session",
      description: "",
    };
  }
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
