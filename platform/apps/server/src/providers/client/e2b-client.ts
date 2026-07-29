import { Sandbox } from "e2b";
import { env } from "../../lib/env.js";
import { CreateInstanceProps } from "../types.js";
import { addSandboxSetupJob } from "../../jobs/sandbox-setup.js";

export class E2BClient {
  async terminateInstance(instanceId: string) {
    try {
      //TODO: incase the e2b termianted it before we dont wanna fail automated request
      //But for future find a better way to handle this as this charges user a little more then the user actaully had used
      await Sandbox.kill(instanceId, { apiKey: env.E2B_API_KEY });
    } catch (e) {}
    return true;
  }

  async createInstance({
    instanceName,
    userData,
    instanceType,
    terminatedAfterInMinutes,
  }: CreateInstanceProps) {
    const terminateInstanceInSecs = terminatedAfterInMinutes * 60;

    const sandbox = await Sandbox.create(instanceType, {
      apiKey: env.E2B_API_KEY,
      timeoutMs: 1000 * terminateInstanceInSecs,
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
