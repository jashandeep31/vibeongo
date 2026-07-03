import { generateText, isStepCount, Output } from "ai";
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
    stopWhen: isStepCount(20),
    prompt: `Type:${type} ${body}`,
    output: Output.object({
      schema: z.object({
        tasks: z.array(
          z.object({
            task: z.string(),
            agent: z.enum(["build", "plan", "issue-resolver", "pr-reviewer"]),
          }),
        ),
      }),
    }),
  });
  return res.output.tasks;
};
