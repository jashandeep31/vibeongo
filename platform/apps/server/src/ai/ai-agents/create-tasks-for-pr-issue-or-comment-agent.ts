import { generateText, Output } from "ai";
import { z } from "zod";
import { prompts } from "../prompts/index.js";

export const createTasksForPRIssueOrCommentAgent = async (
  type: "comment" | "pr" | "issue",
  body: string,
) => {
  const res = await generateText({
    model: "openai/gpt-5.5",
    instructions: prompts.createTasksForPRIssueOrCommentAgent.systemPrompt(),
    reasoning: "high",
    prompt: `Type:${type} ${body}`,
    output: Output.object({
      schema: z.object({}),
    }),
  });
  console.log(res);
};
