import { Queue } from "bullmq";
import { redis } from "../lib/valkey.js";

export const PROJECT_AUTOMATION_WEBHOOK_QUEUE_NAME =
  "project-automation-webhook";
const PROJECT_AUTOMATION_WEBHOOK_JOB_NAME =
  "process-project-automation-webhook" as const;

export type ProjectAutomationWebhookJobData = {
  automationId: string;
  automationTriggerId: string;
};

const projectAutomationWebhookQueue = new Queue<
  ProjectAutomationWebhookJobData,
  void,
  typeof PROJECT_AUTOMATION_WEBHOOK_JOB_NAME
>(PROJECT_AUTOMATION_WEBHOOK_QUEUE_NAME, {
  connection: redis as any,
});

projectAutomationWebhookQueue.on("error", (error) => {
  console.error("Project automation webhook queue error", error);
});

export const addProjectAutomationWebhookJob = async (
  data: ProjectAutomationWebhookJobData,
) => {
  await projectAutomationWebhookQueue.add(
    PROJECT_AUTOMATION_WEBHOOK_JOB_NAME,
    data,
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5_000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  );
};
