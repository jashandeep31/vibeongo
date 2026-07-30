import { env } from "../../lib/env.js";
import { CreateInstanceProps } from "../types.js";
import { Daytona } from "@daytona/sdk";
import { addSandboxSetupJob } from "../../jobs/sandbox-setup.js";

const daytona = new Daytona({
  apiKey: env.DAYTONA_API_KEY,
});

export class DaytonaClient {
  async terminateInstance(instanceId: string) {
    try {
      const sandbox = await daytona.get(instanceId);
      await daytona.delete(sandbox);
    } catch {}
    return true;
  }

  async createInstance({
    instanceName,
    userData,
    instanceType,
    terminatedAfterInMinutes,
  }: CreateInstanceProps) {
    const sandbox = await daytona.create({
      // image: Image.base("ubuntu:22.04"),
      snapshot: instanceType,
      // resources: { cpu: 2, memory: 4, disk: 8 },
      public: false,
      ttlMinutes: terminatedAfterInMinutes,
      networkBlockAll: false,
    });

    await addSandboxSetupJob({
      provider: "daytona",
      sandboxId: sandbox.id,
      userData,
    });
    const preview = await sandbox.getPreviewLink(3101);

    return {
      instanceId: sandbox.id,
      instanceName: instanceName,
      publicIPv4: preview.url,
      pvtIPv4: preview.url,
    };
  }

  async getSignedPreviewUrl({
    sandboxId,
    port,
    expiresInSeconds,
  }: {
    sandboxId: string;
    port: number;
    expiresInSeconds: number;
  }): Promise<{ url: string; token: string }> {
    const sandbox = await daytona.get(sandboxId);
    return sandbox.getSignedPreviewUrl(port, expiresInSeconds);
  }
}
