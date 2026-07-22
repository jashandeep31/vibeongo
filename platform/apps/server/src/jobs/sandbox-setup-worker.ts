import { Worker } from "bullmq";
import { Sandbox } from "e2b";
import {
  SANDBOX_SETUP_QUEUE_NAME,
  type SandboxSetupJobData,
} from "./sandbox-setup.js";
import { env } from "../lib/env.js";
import { redis } from "../lib/valkey.js";

const SETUP_TIMEOUT_MS = 1000 * 60 * 10;

export const sandboxSetupWorker = new Worker<SandboxSetupJobData>(
  SANDBOX_SETUP_QUEUE_NAME,
  async (job) => {
    const { sandboxId, userData } = job.data;
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: env.E2B_KEY,
    });
    const encodedUserData = Buffer.from(userData, "utf8").toString("base64");

    await sandbox.commands.run(
      `echo '${encodedUserData}' | base64 -d > setup.sh && chmod +x setup.sh && ./setup.sh`,
      {
        timeoutMs: SETUP_TIMEOUT_MS,
        onStdout: (data: string): void => {
          process.stdout.write(data);
        },
        onStderr: (data: string): void => {
          process.stderr.write(data);
        },
      },
    );

    console.log(`Sandbox ${sandboxId} setup completed`);
  },
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
    concurrency: 2,
  },
);

sandboxSetupWorker.on("ready", () => {
  console.log("Sandbox setup worker is ready");
});

sandboxSetupWorker.on("error", (error) => {
  console.error("Sandbox setup worker error", error);
});

sandboxSetupWorker.on("failed", (job, error) => {
  console.error(
    `Sandbox setup job ${job?.id ?? "unknown"} failed`,
    error,
  );
});
