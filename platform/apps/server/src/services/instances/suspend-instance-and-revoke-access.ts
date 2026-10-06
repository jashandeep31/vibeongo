import {
  and,
  db,
  eq,
  inArray,
  instanceOpenRouterKeys,
  instances,
  instanceSlots,
  sandboxTypes,
} from "@repo/db";
import { createId } from "@paralleldrive/cuid2";
import crypto from "crypto";
import { AppError } from "../../lib/app-error.js";
import { invalidateProxyHosts } from "../../lib/invalidate-project-proxies-by-pid.js";
import { invalidateCachedProxyPreviews } from "../../cache/proxy-preview-cache.js";
import { E2BClient } from "../../providers/client/e2b-client.js";
import { getOpenRouterKeyChargesAnTerminateKey } from "../openrouter/index.js";
import { dispatchQueuedInstanceLaunches } from "./check-and-queue-instance-launch.js";
import {
  chargeInstancePeriod,
  getOrOpenRunningPeriod,
  openInstancePeriod,
} from "./charge-instance-period.js";
import {
  calculateSandboxUsageCost,
  clearInstanceDomainRouting,
  queueInstanceGitTokenRevocations,
} from "./terminate-instance-and-charge-usage.js";
import { PAUSEABLE_SANDBOX_PROVIDERS } from "../../providers/constants.js";
import { BoatClient } from "../../providers/client/boat-client.js";

const e2bClient = new E2BClient();
const boatClient = new BoatClient();

interface SuspendInstanceAndRevokeAccessProps {
  instanceId: string;
  userId: string;
}

const clearRuntimeSecrets = async (
  instance: typeof instances.$inferSelect,
  provider: "e2b" | "boat",
) => {
  const config =
    instance.config && typeof instance.config === "object"
      ? (instance.config as Record<string, unknown>)
      : {};
  const localToken =
    typeof config.vibeongoLocalToken === "string"
      ? config.vibeongoLocalToken
      : "";

  try {
    if (!instance.public_ip || !localToken) {
      throw new Error("runtime address or local token is missing");
    }
    let targetUrl: string;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${localToken}`,
    };
    if (provider === "boat") {
      const preview = await boatClient.getPreviewTarget({
        sandboxId: instance.provider_instance_id,
        port: 3101,
      });
      targetUrl = preview.targetUrl;
      headers.Cookie = `_port_auth=${preview.token}`;
    } else {
      targetUrl = `https://${instance.public_ip}`;
      headers["e2b-traffic-access-token"] = await e2bClient.getPreviewToken({
        sandboxId: instance.provider_instance_id,
      });
    }
    const response = await fetch(new URL("/clear-secrets", targetUrl), {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`status ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    console.error(
      `Could not clear runtime secrets before suspending instance ${instance.id}`,
      error,
    );
    throw new AppError(
      "Could not clear the instance before suspending it. Please try again.",
      502,
    );
  }
};

export const suspendInstanceAndRevokeAccess = async ({
  instanceId,
  userId,
}: SuspendInstanceAndRevokeAccessProps) => {
  const [row] = await db
    .select({ instance: instances, sandboxType: sandboxTypes })
    .from(instances)
    .innerJoin(sandboxTypes, eq(sandboxTypes.id, instances.sandbox_type_id))
    .where(and(eq(instances.id, instanceId), eq(instances.user_id, userId)));

  if (!row) throw new AppError("Instance not found", 404);
  const { instance, sandboxType } = row;

  if (instance.state !== "running") {
    throw new AppError("Only running instances can be suspended", 409);
  }
  const provider = sandboxType.provider;
  if (provider !== "e2b" && provider !== "boat") {
    throw new AppError(
      `Only ${PAUSEABLE_SANDBOX_PROVIDERS.join(", ")} sandboxes can be suspended`,
      400,
    );
  }

  await clearRuntimeSecrets(instance, provider);

  const aiCharges = await getOpenRouterKeyChargesAnTerminateKey(instance.id);

  let paused: boolean = false;
  switch (sandboxType.provider) {
    case "e2b":
      paused = await e2bClient.suspendInstance(instance.provider_instance_id);
      break;
    case "boat":
      paused = await boatClient.pauseInstance(instance.provider_instance_id);
      break;
    default:
      throw new AppError("Unknown sandbox provider", 500);
  }

  if (!paused) {
    // TODO: handle this more properly
    throw new AppError(
      "Could not suspend the instance. Please try again.",
      502,
    );
  }
  const suspendedAt = new Date();
  const uptimeInMin = Math.ceil(
    (suspendedAt.getTime() - instance.started_at.getTime()) / 1000 / 60,
  );
  const computeAmount = calculateSandboxUsageCost({
    pricePerSecond: sandboxType.price_per_second,
    uptimeInMin,
  });

  const instanceConfig =
    instance.config && typeof instance.config === "object"
      ? (instance.config as Record<string, unknown>)
      : {};

  const suspendedSlot = await db.transaction(async (tx) => {
    const [suspendedInstance] = await tx
      .update(instances)
      .set({
        state: "suspended",
        access_token: createId(),
        config: {
          ...instanceConfig,
          sessionToken: `vps_${createId()}${crypto.randomBytes(16).toString("hex")}`,
        },
        updated_at: suspendedAt,
      })
      .where(and(eq(instances.id, instanceId), eq(instances.state, "running")))
      .returning({ id: instances.id });

    if (!suspendedInstance) {
      throw new AppError("Instance is no longer running", 409);
    }

    const [slot] = await tx
      .update(instanceSlots)
      .set({ status: "suspended", updated_at: suspendedAt })
      .where(
        and(
          eq(instanceSlots.instance_id, instanceId),
          inArray(instanceSlots.status, ["active", "provisioning"]),
        ),
      )
      .returning({ category: instanceSlots.category });

    const runningPeriodId = await getOrOpenRunningPeriod({
      tx,
      instance,
      ratePerSecond: sandboxType.price_per_second,
    });
    await chargeInstancePeriod({
      tx,
      periodId: runningPeriodId,
      instance,
      endedAt: suspendedAt,
      computeAmount,
      aiAmount: aiCharges,
      event: "suspended",
    });

    await openInstancePeriod({
      tx,
      instanceId,
      kind: "suspended",
      startedAt: suspendedAt,
      ratePerSecond: 0,
    });

    await tx
      .delete(instanceOpenRouterKeys)
      .where(eq(instanceOpenRouterKeys.instance_id, instanceId));

    return slot;
  });

  await queueInstanceGitTokenRevocations(instanceId);
  await clearInstanceDomainRouting({ instanceId, userId });
  await invalidateCachedProxyPreviews(provider, instance.provider_instance_id);
  if (instance.project_id) {
    await invalidateProxyHosts(
      instance.project_id,
      [`3101-${instance.id}`, `4096-${instance.id}`],
      instance.proxy_domain,
    );
  }

  if (suspendedSlot) {
    try {
      await dispatchQueuedInstanceLaunches({
        userId,
        category: suspendedSlot.category,
      });
    } catch (error) {
      console.error(
        "Could not dispatch a queued instance after suspension",
        error,
      );
    }
  }
};
