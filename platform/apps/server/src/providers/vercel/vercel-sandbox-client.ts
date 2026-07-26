import { Sandbox } from "@vercel/sandbox";
import { CreateInstanceProps } from "../types.js";
import { consoleIntegration } from "@sentry/node";
import { env } from "../../lib/env.js";
export class VercelSandBoxClient {
  async createInstance({
    instanceName,
    userData,
    instanceType,
    terminatedAfterInMinutes,
  }: CreateInstanceProps) {
    const terminateInstanceInSecs = terminatedAfterInMinutes * 60;

    const sandbox = await Sandbox.create({
      ports: [3000, 3010, 3101],
      teamId: env.VERCEL_TEAM_ID,
      projectId: env.VERCEL_PROJECT_ID,
      token: env.VERCEL_TOKEN,
      timeout: 1 * 60 * 1000,
    });

    // await addSandboxSetupJob({
    //   sandboxId: sandbox.sandboxId,
    //   userData,
    // });
    //
    console.log(sandbox.domain(3010));
    console.log(sandbox.domain(3000));
    return {
      instanceId: sandbox.name,
      instanceName: instanceName,
      publicIPv4: sandbox.domain(3101),
      pvtIPv4: sandbox.domain(3101),
    };
  }

  async terminateInstance(instanceId: string) {
    try {
      const sandbox = await Sandbox.get({
        name: instanceId,
        teamId: env.VERCEL_TEAM_ID,
        projectId: env.VERCEL_PROJECT_ID,
        token: env.VERCEL_TOKEN,
      });

      // delete the sandbox
      await sandbox.delete();
    } catch (e) {
      // Handle error silently as per your TODO comment
      console.error("Error terminating sandbox:", e);
    }
    return true;
  }
}
