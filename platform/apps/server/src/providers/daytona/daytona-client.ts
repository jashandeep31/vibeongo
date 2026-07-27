import { env } from "../../lib/env.js";
import { CreateInstanceProps } from "../types.js";
import { Daytona, Image } from "@daytona/sdk";

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
      image: Image.base("ubuntu:22.04"),
      resources: { cpu: 2, memory: 4, disk: 8 },
      public: true,
      ttlMinutes: terminatedAfterInMinutes,
    });

    const encodedUserData = Buffer.from(userData, "utf8").toString("base64");
    const setup = await sandbox.process.executeCommand(
      `echo '${encodedUserData}' | base64 -d > /tmp/setup.sh && chmod +x /tmp/setup.sh && /tmp/setup.sh`,
      undefined,
      undefined,
      600,
    );
    if (setup.exitCode !== 0) {
      await daytona.delete(sandbox);
      throw new Error("Daytona sandbox setup failed");
    }

    const preview = await sandbox.getPreviewLink(3101);

    return {
      instanceId: sandbox.id,
      instanceName: instanceName,
      publicIPv4: preview.url,
      pvtIPv4: preview.url,
    };
  }
}
