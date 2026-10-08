import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";
import type {
  CreateInstanceProps,
  CreateInstanceProviderResponse,
} from "../types.js";
import {
  BoatApi,
  Configuration,
  waitUntilReady,
  type SandboxInfoResponse,
  type SandboxStateEnum,
} from "@boatdev/sdk";
import { addSandboxSetupJob } from "../../jobs/sandbox-setup.js";
import { PROVIDER_TERMINATION_GRACE_MINUTES } from "../constants.js";
import { MAX_BOAT_EXTENSION_MINUTES } from "@repo/shared/providers";

const BOAT_READY_STATES: readonly SandboxStateEnum[] = [
  "ready",
  "idle",
  "running",
];

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
      ttlSeconds:
        (terminatedAfterInMinutes + PROVIDER_TERMINATION_GRACE_MINUTES) * 60,
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

  /**
   * Pause the sandbox so that user can resume it later.
   *
   * @param sandboxId - Sandbox id given by the boat
   * @returns boolea true if the sandbox is paused
   */
  async pauseInstance(sandboxId: string): Promise<boolean> {
    // NOTE: we don't need to worry this about the failure as boat.dev not charge for this even if the sandbox is not paused
    // SOURCE: https://docs.boat.dev/sdks/typescript
    // But we will verify it for our own sanity
    await boatSandboxClient.stop({ sandboxId });
    const state = await this.getSandboxState(sandboxId);

    if (state === "archived") {
      return true;
    }

    let retries = 0;
    let timegap = 0;
    while (retries < 10) {
      await new Promise((resolve) => setTimeout(resolve, timegap * 1000));
      timegap += 2;
      const state = await this.getSandboxState(sandboxId);
      if (state === "archived") {
        return true;
      }
      retries++;
    }
    return false;
  }

  async resumeInstance(sandboxId: string, timeoutMs: number): Promise<boolean> {
    await boatSandboxClient.resume({
      sandboxId,
      ttlSeconds:
        Math.ceil(timeoutMs / 1000) + PROVIDER_TERMINATION_GRACE_MINUTES * 60,
    });
    const state = await this.getSandboxState(sandboxId);

    if (BOAT_READY_STATES.includes(state)) {
      return true;
    }
    let retries = 0;
    let timegap = 0;
    while (retries < 10) {
      await new Promise((resolve) => setTimeout(resolve, timegap * 1000));
      timegap += 2;
      const state = await this.getSandboxState(sandboxId);
      if (BOAT_READY_STATES.includes(state)) {
        return true;
      }
      retries++;
    }
    return false;
  }
  async getSandboxState(sandboxId: string) {
    const { sandbox } = await boatSandboxClient.get({ sandboxId });
    return sandbox.state;
  }

  /** Add minutes to the current deadline, or retry an already recorded target deadline. */
  async extendTime(
    sandboxId: string,
    additionalMinutes: number,
    targetDeadline?: Date,
  ): Promise<SandboxInfoResponse> {
    if (
      !Number.isSafeInteger(additionalMinutes) ||
      additionalMinutes < 1 ||
      additionalMinutes > MAX_BOAT_EXTENSION_MINUTES
    ) {
      throw new AppError(
        `Extension must be a whole number of minutes from 1 to ${MAX_BOAT_EXTENSION_MINUTES}`,
        400,
      );
    }

    const current = await boatSandboxClient.get(
      { sandboxId },
      {
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!current.ok) {
      throw new AppError("Boat sandbox information is unavailable", 502);
    }
    if (!BOAT_READY_STATES.includes(current.sandbox.state)) {
      throw new AppError(
        "Only a running Boat sandbox can extend its time",
        409,
      );
    }
    if (!current.sandbox.archiveAfter) {
      throw new AppError("Boat sandbox auto-stop is disabled", 409);
    }

    const currentDeadline = current.sandbox.archiveAfter.getTime();
    const now = Date.now();
    if (!Number.isFinite(currentDeadline) || currentDeadline <= now) {
      throw new AppError(
        "Boat sandbox auto-stop deadline has expired or is invalid",
        409,
      );
    }
    const requestedDeadline =
      targetDeadline?.getTime() ?? currentDeadline + additionalMinutes * 60_000;
    if (
      !Number.isFinite(new Date(requestedDeadline).getTime()) ||
      requestedDeadline <= now
    ) {
      throw new AppError("Requested Boat sandbox extension is too large", 400);
    }

    if (targetDeadline && currentDeadline >= requestedDeadline) return current;

    const updated = await boatSandboxClient.update(
      {
        sandboxId,
        ttlSeconds: Math.ceil((requestedDeadline - Date.now()) / 1000),
      },
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!updated.ok) {
      throw new AppError("Boat sandbox time extension failed", 502);
    }
    // Return the provider's actual deadline and any account-limit notice.
    return updated;
  }

  async runCommand(
    sandboxId: string,
    command: string,
    timeoutMs = 5 * 60 * 1000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    const started = await boatSandboxClient.command({
      sandboxId,
      command,
      detached: true,
      timeoutSeconds: Math.ceil(timeoutMs / 1000),
    });
    if (!("processId" in started)) {
      throw new AppError("Boat sandbox command did not start", 502);
    }
    while (Date.now() < deadline) {
      const status = await boatSandboxClient.commandStatus({
        sandboxId,
        processId: started.processId,
      });
      if (!status.running) {
        if (status.exitCode !== 0) {
          throw new AppError(
            `Boat sandbox command failed with exit code ${status.exitCode}`,
            502,
          );
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new AppError("Boat sandbox command timed out", 502);
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
    let response: Response;
    try {
      response = await fetch(target, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new AppError("Boat sandbox preview authentication failed", 502);
    }

    const portAuthCookie = response.headers
      .getSetCookie()
      .find((cookie) => cookie.startsWith("_port_auth="));
    const token = portAuthCookie?.split(";", 1)[0]?.slice("_port_auth=".length);
    if (!token) {
      throw new AppError("Boat sandbox preview cookie is unavailable", 502);
    }
    target.searchParams.delete("_token");

    return { targetUrl: target.toString(), token };
  }
}
