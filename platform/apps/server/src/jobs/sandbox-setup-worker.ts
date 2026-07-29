import { Worker } from "bullmq";
import { Sandbox as E2BSandbox } from "e2b";
import { Daytona } from "@daytona/sdk";
import { Sandbox as VercelSandbox } from "@vercel/sandbox";
import {
  SANDBOX_SETUP_QUEUE_NAME,
  type SandboxSetupJobData,
} from "./sandbox-setup.js";
import { env } from "../lib/env.js";
import { redis } from "../lib/valkey.js";

const SETUP_TIMEOUT_MS = 1000 * 60 * 10;
const daytona = new Daytona({
  apiKey: env.DAYTONA_API_KEY,
});
const vercelCredentials = {
  token: env.VERCEL_TOKEN,
  teamId: env.VERCEL_TEAM_ID,
  projectId: env.VERCEL_PROJECT_ID,
};

const encodeUserData = (userData: string) =>
  Buffer.from(userData, "utf8").toString("base64");

const setupE2BSandbox = async (sandboxId: string, userData: string) => {
  const sandbox = await E2BSandbox.connect(sandboxId, {
    apiKey: env.E2B_API_KEY,
  });
  const encodedUserData = encodeUserData(userData);

  await sandbox.commands.run(
    `echo '${encodedUserData}' | base64 -d > setup.sh && chmod +x setup.sh && ./setup.sh`,
    {
      user: "ubuntu",
      timeoutMs: SETUP_TIMEOUT_MS,
      onStdout: (data: string): void => {
        process.stdout.write(data);
      },
    },
  );
};

const setupDaytonaSandbox = async (sandboxId: string, userData: string) => {
  const sandbox = await daytona.get(sandboxId);
  const encodedUserData = encodeUserData(userData);
  const setup = await sandbox.process.executeCommand(
    `
set -euo pipefail

printf '%s' '${encodedUserData}' | base64 -d > /home/ubuntu/setup.sh
chmod 700 /home/ubuntu/setup.sh
chown ubuntu:ubuntu /home/ubuntu/setup.sh

runuser -u ubuntu -- bash -lc '
  sudo apt install jq -y
  echo "Running as: $(whoami)"
  echo "Home: $HOME"

  cd "$HOME"
  bash /home/ubuntu/setup.sh
'
`,
    undefined,
    undefined,
    SETUP_TIMEOUT_MS / 1000,
  );

  if (setup.exitCode !== 0) {
    throw new Error(
      `Daytona sandbox setup failed with exit code ${setup.exitCode}`,
    );
  }
};

const setupVercelSandbox = async (sandboxId: string, userData: string) => {
  const sandbox = await VercelSandbox.get({
    ...vercelCredentials,
    name: sandboxId,
  });
  const encodedUserData = encodeUserData(userData);
  const setup = await sandbox.runCommand({
    cmd: "bash",
    cwd: "/home/ubuntu",
    args: [
      "-lc",
      `echo '${encodedUserData}' | base64 -d > /home/ubuntu/setup.sh && chmod +x /home/ubuntu/setup.sh && /home/ubuntu/setup.sh`,
    ],
    timeoutMs: SETUP_TIMEOUT_MS,
  });

  if (setup.exitCode !== 0) {
    throw new Error(
      `Vercel sandbox setup failed with exit code ${setup.exitCode}`,
    );
  }
};

export const sandboxSetupWorker = new Worker<SandboxSetupJobData>(
  SANDBOX_SETUP_QUEUE_NAME,
  async (job) => {
    const { sandboxId, userData, provider = "e2b" } = job.data;

    switch (provider) {
      case "e2b":
        return setupE2BSandbox(sandboxId, userData);
      case "daytona":
        return setupDaytonaSandbox(sandboxId, userData);
      case "vercel":
        return setupVercelSandbox(sandboxId, userData);
      default:
        provider satisfies never;
        throw new Error(`Unsupported sandbox provider: ${provider}`);
    }
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
  console.error(`Sandbox setup job ${job?.id ?? "unknown"} failed`, error);
});
