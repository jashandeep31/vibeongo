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
  async createInstance({
    instanceName,
    instanceType,
    terminatedAfterInMinutes,
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

  async setupInstance(_sandboxId: string, _userData: string): Promise<void> {
    throw new AppError("Boat sandbox setup is not implemented", 501);
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
