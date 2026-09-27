import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";
import type {
  CreateInstanceProps,
  CreateInstanceProviderResponse,
} from "../types.js";
import { BoatApi, Configuration, waitUntilReady } from "@boatdev/sdk";
import { addSandboxSetupJob } from "../../jobs/sandbox-setup.js";

const boatSandboxClient = new BoatApi(
  new Configuration({
    basePath: env.BOAT_BASE_URL,
    accessToken: env.BOAT_API_KEY!,
  }),
);

export class BoatClient {
  async createInstance({
    instanceName,
    instanceType,
    terminatedAfterInMinutes,
    userData,
  }: CreateInstanceProps): Promise<CreateInstanceProviderResponse> {
    const created = await boatSandboxClient.create({
      from: instanceType,
      ttlSeconds: terminatedAfterInMinutes * 60,
    });
    const sandbox = await waitUntilReady(boatSandboxClient, created.sandbox.id);
    const preview = await this.getPreviewTarget({
      sandboxId: sandbox.id,
      port: 3101,
    });
    await addSandboxSetupJob({
      provider: "boat",
      sandboxId: sandbox.id,
      userData,
    });

    return {
      instanceId: sandbox.id,
      instanceName,
      publicIPv4: preview.targetUrl,
      pvtIPv4: preview.targetUrl,
    };
  }

  async terminateInstance(instanceId: string): Promise<boolean> {
    const accepted = await boatSandboxClient.deleteSandbox({
      sandboxId: instanceId,
      xAsciiConfirmDelete: instanceId,
    });

    return (
      accepted.ok &&
      accepted.operation.kind === "sandbox" &&
      accepted.operation.targetId === instanceId
    );
  }

  async setupInstance(sandboxId: string, userData: string): Promise<void> {
    const encodedUserData = Buffer.from(userData, "utf8").toString("base64");
    const started = await boatSandboxClient.command({
      sandboxId,
      command: `printf '%s' '${encodedUserData}' | base64 -d > /tmp/vibeongo-setup.sh && chmod 700 /tmp/vibeongo-setup.sh && sudo -n bash /tmp/vibeongo-setup.sh`,
      detached: true,
      timeoutSeconds: 600,
    });

    if (!("processId" in started)) {
      throw new AppError("Boat sandbox setup command did not start", 502);
    }

    while (true) {
      const status = await boatSandboxClient.commandStatus({
        sandboxId,
        processId: started.processId,
      });

      if (!status.running) {
        if (status.exitCode !== 0) {
          throw new AppError(
            `Boat sandbox setup failed with exit code ${status.exitCode}`,
            502,
          );
        }
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  async getPreviewTarget({
    sandboxId,
    port,
  }: {
    sandboxId: string;
    port: number;
  }): Promise<{ targetUrl: string; token: string }> {
    const hosted = await boatSandboxClient.hostPort({ sandboxId, port });

    if (!hosted.ok || !hosted.url) {
      throw new AppError("Boat sandbox preview URL is unavailable", 502);
    }
    const target = new URL(hosted.url);
    const token = target.searchParams.get("_token");
    if (!token) {
      throw new AppError("Boat sandbox preview token is unavailable", 502);
    }
    target.searchParams.delete("_token");

    return { targetUrl: target.toString(), token };
  }
}
