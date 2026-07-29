import { Sandbox } from "@vercel/sandbox";
import { env } from "../../lib/env.js";
import type { CreateInstanceProps } from "../types.js";

const SETUP_TIMEOUT_MS = 1000 * 60 * 10;
const credentials = {
  token: env.VERCEL_TOKEN,
  teamId: env.VERCEL_TEAM_ID,
  projectId: env.VERCEL_PROJECT_ID,
};

export class VercelSandboxClient {
  async createInstance({
    instanceName,
    userData,
    terminatedAfterInMinutes,
  }: CreateInstanceProps) {
    const sandbox = await Sandbox.create({
      ...credentials,
      name: instanceName,
      runtime: "node24",
      ports: [3101],
      timeout: terminatedAfterInMinutes * 60 * 1000,
    });
    const encodedUserData = Buffer.from(userData, "utf8").toString("base64");
    const setup = await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-lc",
        `echo '${encodedUserData}' | base64 -d > /tmp/setup.sh && chmod +x /tmp/setup.sh && /tmp/setup.sh`,
      ],
      timeoutMs: SETUP_TIMEOUT_MS,
    });

    if (setup.exitCode !== 0) {
      await sandbox.delete();
      throw new Error("Vercel sandbox setup failed");
    }

    return {
      instanceId: sandbox.name,
      instanceName,
      publicIPv4: sandbox.domain(3101),
      pvtIPv4: sandbox.domain(3101),
    };
  }

  async terminateInstance(instanceId: string) {
    try {
      const sandbox = await Sandbox.get({ ...credentials, name: instanceId });
      await sandbox.delete();
    } catch {
      // An already deleted sandbox is considered terminated.
    }
    return true;
  }
}
