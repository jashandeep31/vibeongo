import { Worker } from "bullmq";
import { redis } from "../lib/valkey.js";
import { processMailJob } from "../services/mail/process-mail-job.js";
import { MAIL_JOB_NAME, MAIL_QUEUE_NAME, type MailJobData } from "./mail.js";

export const mailWorker = new Worker<MailJobData, void, typeof MAIL_JOB_NAME>(
  MAIL_QUEUE_NAME,
  async (job) => {
    await processMailJob(
      job.data,
      job.attemptsMade + 1 >= (job.opts.attempts ?? 1),
    );
  },
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
    concurrency: 2,
    limiter: { max: 1, duration: 1000 },
  },
);
mailWorker.on("error", () => console.error("Mail worker connection error"));
mailWorker.on("failed", (job) =>
  console.error(`Mail job ${job?.id ?? "unknown"} failed`),
);
