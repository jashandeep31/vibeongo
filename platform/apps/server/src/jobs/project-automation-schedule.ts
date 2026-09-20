import { Queue } from "bullmq";
import { redis } from "../lib/valkey.js";

export const PROJECT_AUTOMATION_SCHEDULE_QUEUE_NAME =
  "project-automation-schedule";
export const PROJECT_AUTOMATION_SCHEDULE_JOB_NAME =
  "process-project-automation-schedule" as const;

export type ProjectAutomationScheduleJobData = { automationRunId: string };

const queue = new Queue<
  ProjectAutomationScheduleJobData,
  void,
  typeof PROJECT_AUTOMATION_SCHEDULE_JOB_NAME
>(PROJECT_AUTOMATION_SCHEDULE_QUEUE_NAME, {
  connection: redis as any,
});

queue.on("error", (error) => {
  console.error("Project automation schedule queue error", error);
});

export async function addProjectAutomationScheduleJob({
  automationId,
  automationRunId,
  scheduledFor,
}: ProjectAutomationScheduleJobData & {
  automationId: string;
  scheduledFor: Date;
}) {
  return await queue.add(
    PROJECT_AUTOMATION_SCHEDULE_JOB_NAME,
    { automationRunId },
    {
      jobId: `automation-schedule-${automationId}-${scheduledFor.toISOString()}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    },
  );
}
