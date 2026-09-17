import { z } from "zod";

export const projectAutomationSchema = z.object({
  name: z.string().min(2).max(10),
  description: z.string().max(200).optional(),
  project_id: z.string(),
  cron_expression: z.string(),
  timezone: z.string(),
});

export const projectAutomationTaskSchema = z.object({
  path_from_code: z.string().min(2).max(100),
  task_prompt: z.string().min(2).max(100),
  agent: z.enum(["build", "plan", "issue-resolver", "pr-reviewer"]),
  order_number: z.number().min(1).max(100),
  model: z.string().min(2).max(100).optional(),
});
