import { projectAutomationTasks } from "@repo/db";
import { generateText, Output, stepCountIs } from "ai";
import { z } from "zod";
import { prompts } from "../prompts/index.js";

export type AutomationWebhookTask = Pick<
  typeof projectAutomationTasks.$inferSelect,
  "id" | "path_from_code" | "task_prompt" | "agent" | "order_number" | "model"
>;

const automationWebhookTaskOutputSchema = z.object({
  id: z.string(),
  path_from_code: z.string(),
  task_prompt: z.string(),
  agent: z.enum(["build", "plan", "issue-resolver", "pr-reviewer"]),
  order_number: z.number(),
  model: z.string(),
});

export const resolveProjectAutomationWebhookTasksAgent = async ({
  input,
  tasks,
}: {
  input: string;
  tasks: AutomationWebhookTask[];
}): Promise<AutomationWebhookTask[]> => {
  const result = await generateText({
    model: "zai/glm-5.2",
    system: prompts.resolveProjectAutomationWebhookTasks.systemPrompt(),
    reasoning: "low",
    prompt: JSON.stringify({ input, tasks }),
    stopWhen: stepCountIs(10),
    output: Output.object({
      schema: z.object({
        tasks: z.array(automationWebhookTaskOutputSchema),
      }),
    }),
  });

  return result.output.tasks;
};
