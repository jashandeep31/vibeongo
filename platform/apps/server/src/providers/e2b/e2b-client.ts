import { Sandbox } from "e2b";
import { env } from "../../lib/env.js";
import { CreateInstanceProps } from "../types.js";
import { addSandboxSetupJob } from "../../jobs/sandbox-setup.js";

export class E2BClient {
  async terminateInstance(instanceId: string) {
    return await Sandbox.kill(instanceId, { apiKey: env.E2B_API_KEY });
  }

  async createInstance({
    instanceName,
    userData,
    instanceType,
    terminatedAfterInMinutes,
  }: CreateInstanceProps) {
    const terminateInstanceInSecs =
      terminatedAfterInMinutes > 60 ? 60 * 60 : terminatedAfterInMinutes * 60;

    const time = Date.now();
    const sandbox = await Sandbox.create(instanceType, {
      apiKey: env.E2B_API_KEY,
      timeoutMs: 1000 * terminateInstanceInSecs,
    });

    await addSandboxSetupJob({
      sandboxId: sandbox.sandboxId,
      userData,
    });

    console.log(`time taken is ${Date.now() - time}`);
    return {
      instanceId: sandbox.sandboxId,
      instanceName: instanceName,
      publicIPv4: sandbox.getHost(3101),
      pvtIPv4: sandbox.getHost(3101),
    };
  }
}
