import { generateText } from "ai";
import "../../lib/env.js";
import { prompts } from "../prompts/index.js";

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
  const res = await generateText({
    model: "zai/glm-5.2",
    system: prompts.getSessionNameAndDescription.systemPrompt(),
    reasoning: "high",
    prompt: body,
  });
  console.log(res.text, "we are getting anem ");
  return res.text;
};
