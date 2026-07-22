import { Sandbox } from "e2b";
import { env } from "../../lib/env.js";
import { CreateInstanceProps } from "../types.js";
import { AppError } from "../../lib/app-error.js";
import { addSandboxSetupJob } from "../../jobs/sandbox-setup.js";

export class E2BClient {
  async terminateInstance(instanceId: string) {
    return Sandbox.kill(instanceId, { apiKey: env.E2B_KEY });
  }

  async createInstance({
    region,
    instanceType,
    instanceName,
    userData,
  }: CreateInstanceProps) {
    const sandbox = await Sandbox.create("test", {
      apiKey: env.E2B_KEY,
      timeoutMs: 1000 * 60 * 10,
    });

    await addSandboxSetupJob({
      sandboxId: sandbox.sandboxId,
      userData,
    });

    return {
      instanceId: sandbox.sandboxId,
      instanceName: instanceName,
      publicIPv4: sandbox.getHost(3101),
      pvtIPv4: sandbox.getHost(3101),
    };
  }
}
