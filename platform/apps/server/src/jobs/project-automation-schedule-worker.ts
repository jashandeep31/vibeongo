import { db, eq, projectAutomationRuns } from "@repo/db";
import { Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import { executeScheduledAutomationRun } from "../services/project-automations/execute-scheduled-automation-run.js";
import {
  PROJECT_AUTOMATION_SCHEDULE_JOB_NAME,
  PROJECT_AUTOMATION_SCHEDULE_QUEUE_NAME,
  type ProjectAutomationScheduleJobData,
} from "./project-automation-schedule.js";

export const projectAutomationScheduleWorker =
  new Worker<ProjectAutomationScheduleJobData>(
    PROJECT_AUTOMATION_SCHEDULE_QUEUE_NAME,
    async (job) => {
      try {
        await db
          .update(projectAutomationRuns)
          .set({ status: "working", error: null, updated_at: new Date() })
          .where(eq(projectAutomationRuns.id, job.data.automationRunId));
        await executeScheduledAutomationRun(job.data.automationRunId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Scheduled run failed";
        await db
          .update(projectAutomationRuns)
          .set({
            status: "failed",
            error: message.slice(0, 255),
            updated_at: new Date(),
          })
          .where(eq(projectAutomationRuns.id, job.data.automationRunId));
        throw error;
      }
    },
    {
      connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
      concurrency: 2,
    },
  );

projectAutomationScheduleWorker.on("failed", (job, error) => {
  console.error(
    `Scheduled automation job ${job?.id ?? "unknown"} failed`,
    error,
  );
});
