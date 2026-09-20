import { z } from "zod";

export const projectAutomationSchedules = [
  {
    id: "manual",
    cronExpression: "",
    label: "Manual only (no schedule)",
  },
  {
    id: "nightly-midnight",
    cronExpression: "0 0 * * *",
    label: "Every night at midnight",
  },
  {
    id: "daily-9am",
    cronExpression: "0 9 * * *",
    label: "Every day at 9:00 AM",
  },
  {
    id: "weekly-sunday-midnight",
    cronExpression: "0 0 * * 0",
    label: "Every week on Sunday",
  },
] as const;

export const projectAutomationScheduleIds = [
  "manual",
  "nightly-midnight",
  "daily-9am",
  "weekly-sunday-midnight",
] as const;

export type ProjectAutomationScheduleId =
  (typeof projectAutomationScheduleIds)[number];

export function getProjectAutomationSchedule(id: ProjectAutomationScheduleId) {
  return projectAutomationSchedules.find((schedule) => schedule.id === id)!;
}

export function getProjectAutomationScheduleIdForCronExpression(
  cronExpression: string | null | undefined,
): ProjectAutomationScheduleId {
  return (
    projectAutomationSchedules.find(
      (schedule) => schedule.cronExpression === (cronExpression ?? ""),
    )?.id ?? "manual"
  );
}

function isValidTimeZone(timezone: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export const projectAutomationSchema = z.object({
  name: z.string().min(2).max(20),
  description: z.string().max(200).optional(),
  project_id: z.string(),
  schedule_id: z.enum(projectAutomationScheduleIds),
  timezone: z.string().min(1).refine(isValidTimeZone, "Invalid timezone"),
});

export const projectAutomationTaskSchema = z.object({
  path_from_code: z.string().min(2).max(100),
  task_prompt: z.string().min(2).max(500),
  agent: z.enum(["build", "plan", "issue-resolver", "pr-reviewer"]),
  order_number: z.number().min(1).max(100),
  model: z.string().min(2).max(100).optional(),
});
