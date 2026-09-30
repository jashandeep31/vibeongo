import {
  and,
  db,
  eq,
  inArray,
  instanceOpenRouterKeys,
  instancePeriods,
  instances,
  instanceSlots,
  isNull,
  sandboxTypes,
} from "@repo/db";
import { createId } from "@paralleldrive/cuid2";
import crypto from "crypto";
import { AppError } from "../../lib/app-error.js";
import { E2BClient } from "../../providers/client/e2b-client.js";
import { getOpenRouterKeyChargesAnTerminateKey } from "../openrouter/index.js";
import { dispatchQueuedInstanceLaunches } from "./check-and-queue-instance-launch.js";
import {
  calculateSandboxUsageCost,
  clearInstanceDomainRouting,
  queueInstanceGitTokenRevocations,
} from "./terminate-instance-and-charge-usage.js";

const e2bClient = new E2BClient();

interface SuspendInstanceAndRevokeAccessProps {
  instanceId: string;
  userId: string;
}

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
  if (sandboxType.provider !== "e2b") {
    throw new AppError("Only E2B sandboxes can be suspended", 400);
  }

  const aiCharges = await getOpenRouterKeyChargesAnTerminateKey(instance.id);

  await e2bClient.suspendInstance(instance.provider_instance_id);

  const suspendedAt = new Date();
  const uptimeInMin = Math.ceil(
    (suspendedAt.getTime() - instance.started_at.getTime()) / 1000 / 60,
  );
  const runningAmount =
    calculateSandboxUsageCost({
      pricePerSecond: sandboxType.price_per_second,
      uptimeInMin,
    }) + aiCharges;

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

    const [closedPeriod] = await tx
      .update(instancePeriods)
      .set({
        ended_at: suspendedAt,
        amount: runningAmount,
        updated_at: suspendedAt,
      })
      .where(
        and(
          eq(instancePeriods.instance_id, instanceId),
          eq(instancePeriods.kind, "running"),
          isNull(instancePeriods.ended_at),
        ),
      )
      .returning({ id: instancePeriods.id });

    if (!closedPeriod) {
      await tx.insert(instancePeriods).values({
        instance_id: instanceId,
        kind: "running",
        started_at: instance.started_at,
        ended_at: suspendedAt,
        rate_per_second: sandboxType.price_per_second,
        amount: runningAmount,
      });
    }

    await tx.insert(instancePeriods).values({
      instance_id: instanceId,
      kind: "suspended",
      started_at: suspendedAt,
      rate_per_second: 0,
    });

    await tx
      .delete(instanceOpenRouterKeys)
      .where(eq(instanceOpenRouterKeys.instance_id, instanceId));

    return slot;
  });

  await queueInstanceGitTokenRevocations(instanceId);
  await clearInstanceDomainRouting({ instanceId, userId });

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
