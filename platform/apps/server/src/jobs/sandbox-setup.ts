import { Queue } from "bullmq";
import { randomUUID } from "node:crypto";
import { redis } from "../lib/valkey.js";

export const SANDBOX_SETUP_QUEUE_NAME = "sandbox-setup";

export type SandboxSetupJobData = {
  sandboxId: string;
  userData: string;
} & (
  | {
      provider: "e2b" | "daytona" | "vercel" | "boat";
      scriptType?: "setup";
    }
  | {
      provider: "e2b" | "boat";
      scriptType: "resume";
    }
);

const sandboxSetupQueue = new Queue<SandboxSetupJobData>(
  SANDBOX_SETUP_QUEUE_NAME,
  {
    connection: redis as any,
  },
);

sandboxSetupQueue.on("error", (error) => {
  console.error("Sandbox setup queue error", error);
});

export const addSandboxSetupJob = async (data: SandboxSetupJobData) => {
  await sandboxSetupQueue.add("sandbox-setup-job", data, {
    jobId:
      data.scriptType === "resume"
        ? `${data.provider}-${data.sandboxId}-resume-${randomUUID()}`
        : `${data.provider}-${data.sandboxId}`,
    attempts: 1,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
};
