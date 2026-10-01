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
import { BoatClient } from "../providers/client/boat-client.js";

const SETUP_TIMEOUT_MS = 1000 * 60 * 10;
const RESUME_TIMEOUT_MS = 1000 * 60 * 5;
const daytona = new Daytona({
  apiKey: env.DAYTONA_API_KEY,
});
const vercelCredentials = {
  token: env.VERCEL_TOKEN,
  teamId: env.VERCEL_TEAM_ID,
  projectId: env.VERCEL_PROJECT_ID,
};
const boatClient = new BoatClient();

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
      user: "vibe",
      timeoutMs: SETUP_TIMEOUT_MS,
      onStdout: (data: string): void => {
        process.stdout.write(data);
      },
    },
  );
};

const resumeE2BSandbox = async (
  sandboxId: string,
  script: string,
  sessionToken: string,
) => {
  const sandbox = await E2BSandbox.connect(sandboxId, {
    apiKey: env.E2B_API_KEY,
  });
  await sandbox.commands.run(script, {
    user: "vibe",
    envs: { VIBEONGO_SESSION_TOKEN: sessionToken },
    timeoutMs: RESUME_TIMEOUT_MS,
    onStdout: (data: string): void => {
      process.stdout.write(data);
    },
  });
};

const resumeBoatSandbox = async (
  sandboxId: string,
  script: string,
  sessionToken: string,
) => {
  const quotedSessionToken = `'${sessionToken.replaceAll("'", "'\\''")}'`;
  await boatClient.runCommand(
    sandboxId,
    `sudo -n -H -u vibe env VIBEONGO_SESSION_TOKEN=${quotedSessionToken} bash <<'VIBEONGO_BOAT_RESUME'
${script}
VIBEONGO_BOAT_RESUME`,
    RESUME_TIMEOUT_MS,
  );
};

const setupDaytonaSandbox = async (sandboxId: string, userData: string) => {
  const sandbox = await daytona.get(sandboxId);
  const encodedUserData = encodeUserData(userData);
  const setup = await sandbox.process.executeCommand(
    `
set -euo pipefail

printf '%s' '${encodedUserData}' | base64 -d > /home/vibe/setup.sh
chmod 700 /home/vibe/setup.sh
chown vibe:vibe /home/vibe/setup.sh

runuser -u vibe -- bash -lc '
  echo "Running as: $(whoami)"
  echo "Home: $HOME"

  cd "$HOME"
  bash /home/vibe/setup.sh
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
    cwd: "/home/vibe",
    args: [
      "-lc",
      `echo '${encodedUserData}' | base64 -d > /home/vibe/setup.sh && chmod +x /home/vibe/setup.sh && /home/vibe/setup.sh`,
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
    if (provider === "boat") {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
    if (job.data.scriptType === "resume") {
      if (!job.data.sessionToken) {
        throw new Error("Resume script requires a session token");
      }
      switch (provider) {
        case "e2b":
          return resumeE2BSandbox(sandboxId, userData, job.data.sessionToken);
        case "boat":
          return resumeBoatSandbox(sandboxId, userData, job.data.sessionToken);
        default:
          throw new Error(
            `Resume scripts are unsupported for provider: ${provider}`,
          );
      }
    }
    // NOTE: this needed to be removed
    // add here to remove the race conidtion of sometimes openrouter key isn't created and it just moves without it
    // STILL not best way to handle as its not measured weather 1sec can help or not
    if (provider !== "boat") {
      await new Promise((r) => setTimeout(r, 1000));
    }

    switch (provider) {
      case "e2b":
        return setupE2BSandbox(sandboxId, userData);
      case "daytona":
        return setupDaytonaSandbox(sandboxId, userData);
      case "vercel":
        return setupVercelSandbox(sandboxId, userData);
      case "boat":
        return boatClient.setupInstance(sandboxId, userData);
      default:
        provider satisfies never;
        throw new Error(`Unsupported sandbox provider: ${provider}`);
    }
  },
  {
    connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
    concurrency: 10,
  },
);

sandboxSetupWorker.on("error", (error) => {
  console.error("Sandbox setup worker error", error);
});

sandboxSetupWorker.on("failed", (job, error) => {
  console.error(
    `Sandbox ${job?.data.scriptType ?? "setup"} job ${job?.id ?? "unknown"} failed`,
    error,
  );
});
