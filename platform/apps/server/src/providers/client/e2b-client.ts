import { Sandbox } from "e2b";
import { env } from "../../lib/env.js";
import { CreateInstanceProps } from "../types.js";
import { addSandboxSetupJob } from "../../jobs/sandbox-setup.js";
import { PROVIDER_TERMINATION_GRACE_MINUTES } from "../constants.js";

export class E2BClient {
  async terminateInstance(instanceId: string) {
    return await Sandbox.kill(instanceId, { apiKey: env.E2B_API_KEY });
  }

  async suspendInstance(instanceId: string) {
    await Sandbox.pause(instanceId, {
      apiKey: env.E2B_API_KEY,
      keepMemory: true,
    });
    return true;
  }

  async resumeInstance(instanceId: string, timeoutMs: number) {
    await Sandbox.connect(instanceId, {
      apiKey: env.E2B_API_KEY,
      timeoutMs: timeoutMs + PROVIDER_TERMINATION_GRACE_MINUTES * 60 * 1000,
    });
    return true;
  }

  async runCommand(
    instanceId: string,
    command: string,
    opts: { user?: string; envs?: Record<string, string>; timeoutMs?: number },
  ) {
    const sandbox = await Sandbox.connect(instanceId, {
      apiKey: env.E2B_API_KEY,
    });
    return sandbox.commands.run(command, opts);
  }

  async createInstance({
    instanceName,
    userData,
    instanceType,
    terminatedAfterInMinutes,
  }: CreateInstanceProps) {
    const terminateInstanceInSecs =
      (terminatedAfterInMinutes + PROVIDER_TERMINATION_GRACE_MINUTES) * 60;

    const sandbox = await Sandbox.create(instanceType, {
      metadata: { name: instanceName },
      apiKey: env.E2B_API_KEY,
      timeoutMs: 1000 * terminateInstanceInSecs,
      requestTimeoutMs: 30_000,
      network: {
        allowPublicTraffic: false,
      },
    });

    await addSandboxSetupJob({
      provider: "e2b",
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

  async getPreviewToken({ sandboxId }: { sandboxId: string }): Promise<string> {
    const sandbox = await Sandbox.connect(sandboxId);
    return sandbox.trafficAccessToken!;
  }
}
