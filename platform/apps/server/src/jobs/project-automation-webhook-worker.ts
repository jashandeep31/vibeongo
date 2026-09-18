import { Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import {
  PROJECT_AUTOMATION_WEBHOOK_QUEUE_NAME,
  type ProjectAutomationWebhookJobData,
} from "./project-automation-webhook.js";

export const projectAutomationWebhookWorker =
  new Worker<ProjectAutomationWebhookJobData>(
    PROJECT_AUTOMATION_WEBHOOK_QUEUE_NAME,
    async (job) => {
      console.log("Project automation webhook job received", job.data);
    },
    {
      connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
      concurrency: 1,
    },
  );

projectAutomationWebhookWorker.on("error", (error) => {
  console.error("Project automation webhook worker error", error);
});
