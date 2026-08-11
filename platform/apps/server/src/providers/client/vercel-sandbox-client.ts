import { Sandbox } from "@vercel/sandbox";
import { env } from "../../lib/env.js";
import type { CreateInstanceProps } from "../types.js";
import { addSandboxSetupJob } from "../../jobs/sandbox-setup.js";

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
    instanceType,
  }: CreateInstanceProps) {
    console.log(instanceType);
    const sandbox = await Sandbox.create({
      ...credentials,
      name: instanceName.split(" ").join("-").toLowerCase(),
      source: {
        type: "snapshot",
        snapshotId: instanceType,
      },
      ports: [3101],
      timeout: terminatedAfterInMinutes * 60 * 1000,
    });
    await addSandboxSetupJob({
      provider: "vercel",
      sandboxId: sandbox.name,
      userData,
    });

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

  async getPreviewUrl({
    sandboxId,
    port,
  }: {
    sandboxId: string;
    port: number;
  }): Promise<string> {
    const sandbox = await Sandbox.get({ ...credentials, name: sandboxId });
    return sandbox.domain(port);
  }
}
