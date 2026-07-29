import { Queue } from "bullmq";
import { redis } from "../lib/valkey.js";

export const SANDBOX_SETUP_QUEUE_NAME = "sandbox-setup";

export type SandboxSetupJobData = {
  provider: "e2b" | "daytona" | "vercel";
  sandboxId: string;
  userData: string;
};

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
    jobId: `${data.provider}-${data.sandboxId}`,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
};
