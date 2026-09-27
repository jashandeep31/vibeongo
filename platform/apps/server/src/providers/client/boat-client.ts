import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";
import type {
  CreateInstanceProps,
  CreateInstanceProviderResponse,
} from "../types.js";
import { BoatApi, Configuration, waitUntilReady } from "@boatdev/sdk";

const boatSandboxClient = new BoatApi(
  new Configuration({
    basePath: env.BOAT_BASE_URL,
    accessToken: env.BOAT_API_KEY!,
  }),
);

export class BoatClient {
  async createInstance(
    {
      instanceName,
      instanceType,
      terminatedAfterInMinutes,
    }: CreateInstanceProps,
  ): Promise<CreateInstanceProviderResponse> {
    const created = await boatSandboxClient.create({
      from: instanceType,
      ttlSeconds: terminatedAfterInMinutes * 60,
    });
    const sandbox = await waitUntilReady(
      boatSandboxClient,
      created.sandbox.id,
    );
    const previewUrl = await this.getPreviewUrl({
      sandboxId: sandbox.id,
      port: 3101,
    });

    return {
      instanceId: sandbox.id,
      instanceName,
      publicIPv4: previewUrl,
      pvtIPv4: previewUrl,
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

  async setupInstance(_sandboxId: string, _userData: string): Promise<void> {
    throw new AppError("Boat sandbox setup is not implemented", 501);
  }

  async getPreviewUrl({
    sandboxId,
    port,
  }: {
    sandboxId: string;
    port: number;
  }): Promise<string> {
    const hosted = await boatSandboxClient.hostPort({ sandboxId, port });

    if (!hosted.ok || !hosted.url) {
      throw new AppError("Boat sandbox preview URL is unavailable", 502);
    }

    return hosted.url;
  }
}
