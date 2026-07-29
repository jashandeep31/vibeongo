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
      // image: Image.base("ubuntu:22.04"),
      snapshot: "vibeongo-ubuntu-1",
      // resources: { cpu: 2, memory: 4, disk: 8 },
      public: false,
      ttlMinutes: terminatedAfterInMinutes,
      networkBlockAll: false,
    });

    const encodedUserData = Buffer.from(userData, "utf8").toString("base64");
    const setup = sandbox.process.executeCommand(`
set -euo pipefail

printf '%s' '${encodedUserData}' | base64 -d > /home/ubuntu/setup.sh
chmod 700 /home/ubuntu/setup.sh
chown ubuntu:ubuntu /home/ubuntu/setup.sh

runuser -u ubuntu -- bash -lc '
  sudo apt install jq -y
  echo "Running as: $(whoami)"
  echo "Home: $HOME"

  cd "$HOME"
  bash /home/ubuntu/setup.sh
'
`);
    // console.log(setup.result);
    // if (setup.exitCode !== 0) {
    //   // await daytona.delete(sandbox);
    //   throw new Error("Daytona sandbox setup failed");
    // }
    //
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
