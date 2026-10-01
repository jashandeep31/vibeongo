import {
  and,
  instances,
  db,
  eq,
  instanceRegions,
  instanceTypes,
  projectDomainRouting,
  projectAutomationRuns,
  projectSessions,
  sandboxTypes,
  sandboxRegions,
  instanceSlots,
  inArray,
  gitRepoAccessTokens,
  isNull,
  instancePeriods,
  type Transaction,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";
// import { getEc2InstanceNetworkUsage } from "../../providers/aws/services/get-instance-network-usage.js";
import { invalidateProjectProxiesByPid } from "../../lib/invalidate-project-proxies-by-pid.js";
import { terminateProviderInstance } from "../../providers/terminate-providers-instance.js";
import { getProviderOutboundNetworkUsage } from "../../providers/get-provider-outbound-network-usage.js";
import { INTERNAL_MONEY_SCALE } from "@repo/shared";
import { getOpenRouterKeyChargesAnTerminateKey } from "../openrouter/index.js";
import { dispatchQueuedInstanceLaunches } from "./check-and-queue-instance-launch.js";
import { addGitRepoAccessTokenRevocationJob } from "../../jobs/git-repo-access-token-revocation.js";
import {
  chargeInstancePeriod,
  getOrOpenRunningPeriod,
} from "./charge-instance-period.js";

interface TerminateInstanceAndChargeUsageProps {
  instanceId: string;
  userId: string;
}

interface TerminateInstanceAndChargeUsageWithSessionProps {
  instanceId: string;
  sessionId: string;
}

interface TerminationUsage {
  networkCharges: number;
  uptimeInMin: number;
  totalCostWithProfit: number;
  networkOutInGb: number;
  ratePerSecond: number;
}

const calculateTotalCostWithProfit = ({
  costEachMin,
  uptimeInMin,
  networkCharges,
}: {
  costEachMin: number;
  uptimeInMin: number;
  networkCharges: number;
}) => {
  const totalCost = costEachMin * uptimeInMin + networkCharges;
  const profit = totalCost * (env.PROFIT_PRECENTAGE / 100);
  const totalCostWithProfit = totalCost + profit;

  const minimumCharge = Math.ceil(0.0002 * INTERNAL_MONEY_SCALE);
  return totalCostWithProfit < minimumCharge
    ? minimumCharge
    : Math.ceil(totalCostWithProfit);
};

const closeSessionAfterTermination = async ({
  tx,
  instance,
  userId,
  spinedUpBy,
}: {
  tx: Transaction;
  instance: typeof instances.$inferSelect;
  userId: string;
  spinedUpBy: string | null | undefined;
}) => {
  if (!instance.project_session_id) return;

  await tx
    .update(projectSessions)
    .set({
      archived: true,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(projectSessions.id, instance.project_session_id),
        eq(projectSessions.user_id, userId),
        eq(projectSessions.category, "auto"),
      ),
    );

  if (spinedUpBy === "automation") {
    await tx
      .update(projectAutomationRuns)
      .set({ status: "done", updated_at: new Date(), error: null })
      .where(
        eq(
          projectAutomationRuns.project_session_id,
          instance.project_session_id,
        ),
      );
  }
};

/**
 * Terminate the instance and charge the user
 */
export const terminateInstanceAndChargeUsage = async ({
  instanceId,
  userId,
}: TerminateInstanceAndChargeUsageProps) => {
  // Select the instance, region, and type.
  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, instanceId), eq(instances.user_id, userId)));
  if (!instance) throw new AppError("instance not found", 404);

  if (instance.state === "suspended") {
    await terminateSuspendedInstance({ instance, userId });
    return;
  }

  const [terminatingSlot] = await db
    .update(instanceSlots)
    .set({
      status: "terminating",
      updated_at: new Date(),
    })
    .where(
      and(
        eq(instanceSlots.instance_id, instanceId),
        eq(instanceSlots.user_id, userId),
        inArray(instanceSlots.status, [
          "active",
          "provisioning",
          "terminating",
        ]),
      ),
    )
    .returning({ id: instanceSlots.id });

  if (!terminatingSlot) {
    throw new AppError("Active instance slot not found", 404);
  }

  const openrouterCharges = await getOpenRouterKeyChargesAnTerminateKey(
    instance.id,
  );

  const {
    totalCostWithProfit: totalCostWithProfitWithoutAICharges,
    networkCharges,
    networkOutInGb,
    ratePerSecond,
  } = instance.runtime_kind === "vm"
    ? await terminateVmInstance({
        instance: instance,
      })
    : await terminateSandboxInstance({
        instance: instance,
      });

  const networkAmount = Math.min(
    totalCostWithProfitWithoutAICharges,
    Math.ceil(networkCharges * (1 + env.PROFIT_PRECENTAGE / 100)),
  );

  // Start the database transaction.
  const terminatedSlot = await db.transaction(async (tx) => {
    const terminatedAt = new Date();

    // Only one request can claim and charge a running instance.
    // Mark the instance as terminated with the termination time.
    const [instanceToTerminate] = await tx
      .update(instances)
      .set({
        terminated_at: terminatedAt,
        state: "terminated",
      })
      .where(and(eq(instances.id, instanceId), eq(instances.state, "running")))
      .returning({ id: instances.id });

    const [terminatedSlot] = await tx
      .update(instanceSlots)
      .set({
        status: "terminated",
        updated_at: new Date(),
      })
      .where(eq(instanceSlots.instance_id, instanceId))
      .returning({
        category: instanceSlots.category,
        spined_up_by: instanceSlots.spun_up_by,
      });

    if (!instanceToTerminate) return terminatedSlot;

    await closeSessionAfterTermination({
      tx,
      instance,
      userId,
      spinedUpBy: terminatedSlot?.spined_up_by,
    });

    const runningPeriodId = await getOrOpenRunningPeriod({
      tx,
      instance,
      ratePerSecond,
    });
    await chargeInstancePeriod({
      tx,
      periodId: runningPeriodId,
      instance,
      endedAt: terminatedAt,
      computeAmount: totalCostWithProfitWithoutAICharges - networkAmount,
      aiAmount: openrouterCharges,
      networkAmount,
      networkOutGb: networkOutInGb,
      event: "terminated",
    });

    return terminatedSlot;
  });

  await queueInstanceGitTokenRevocations(instanceId);

  // Remove the routes and invalidate affected project proxies.
  await clearInstanceDomainRouting({ instanceId, userId });

  if (terminatedSlot) {
    try {
      await dispatchQueuedInstanceLaunches({
        userId,
        category: terminatedSlot.category,
      });
    } catch (error) {
      console.error(
        "Could not dispatch a queued instance after termination",
        error,
      );
    }
  }

  return;
};

const terminateSuspendedInstance = async ({
  instance,
  userId,
}: {
  instance: typeof instances.$inferSelect;
  userId: string;
}) => {
  const [terminatingSlot] = await db
    .update(instanceSlots)
    .set({ status: "terminating", updated_at: new Date() })
    .where(
      and(
        eq(instanceSlots.instance_id, instance.id),
        eq(instanceSlots.user_id, userId),
        inArray(instanceSlots.status, ["suspended", "terminating"]),
      ),
    )
    .returning({ id: instanceSlots.id });
  if (!terminatingSlot) {
    throw new AppError("Suspended instance slot not found", 404);
  }

  const [sandboxWithRegion] = await db
    .select()
    .from(sandboxTypes)
    .innerJoin(
      sandboxRegions,
      eq(sandboxRegions.id, sandboxTypes.sandbox_region),
    )
    .where(eq(sandboxTypes.id, instance.sandbox_type_id!));
  if (!sandboxWithRegion) throw new AppError("Sandbox not found ", 404);

  const terminationResponse = await terminateProviderInstance({
    provider: sandboxWithRegion.sandbox_types.provider,
    region: sandboxWithRegion.sandbox_regions.slug,
    instanceId: instance.provider_instance_id,
    runtime: instance.runtime_kind,
  });
  if (!terminationResponse.terminated) {
    throw new AppError("Failed to terminate instance", 502);
  }

  await db.transaction(async (tx) => {
    const terminatedAt = new Date();
    const [instanceToTerminate] = await tx
      .update(instances)
      .set({ terminated_at: terminatedAt, state: "terminated" })
      .where(
        and(eq(instances.id, instance.id), eq(instances.state, "suspended")),
      )
      .returning({ id: instances.id });

    const [terminatedSlot] = await tx
      .update(instanceSlots)
      .set({ status: "terminated", updated_at: terminatedAt })
      .where(eq(instanceSlots.instance_id, instance.id))
      .returning({ spined_up_by: instanceSlots.spun_up_by });

    if (!instanceToTerminate) return;

    await closeSessionAfterTermination({
      tx,
      instance,
      userId,
      spinedUpBy: terminatedSlot?.spined_up_by,
    });

    const [suspendedPeriod] = await tx
      .select({ id: instancePeriods.id })
      .from(instancePeriods)
      .where(
        and(
          eq(instancePeriods.instance_id, instance.id),
          eq(instancePeriods.kind, "suspended"),
          isNull(instancePeriods.ended_at),
        ),
      )
      .for("update");
    if (suspendedPeriod) {
      await chargeInstancePeriod({
        tx,
        periodId: suspendedPeriod.id,
        instance,
        endedAt: terminatedAt,
        storageAmount: 0,
        event: "terminated",
      });
    }
  });

  await queueInstanceGitTokenRevocations(instance.id);
  await clearInstanceDomainRouting({ instanceId: instance.id, userId });
};

export const clearInstanceDomainRouting = async ({
  instanceId,
  userId,
}: {
  instanceId: string;
  userId: string;
}) => {
  const updatedRoutings = await db
    .update(projectDomainRouting)
    .set({
      target_instance_id: null,
    })
    .where(
      and(
        eq(projectDomainRouting.target_instance_id, instanceId),
        eq(projectDomainRouting.user_id, userId),
      ),
    )
    .returning();

  for (const routing of updatedRoutings) {
    await invalidateProjectProxiesByPid(routing.project_id);
  }
};

export const queueInstanceGitTokenRevocations = async (instanceId: string) => {
  let tokens: Array<{ id: string }>;

  try {
    tokens = await db
      .select({ id: gitRepoAccessTokens.id })
      .from(gitRepoAccessTokens)
      .where(
        and(
          eq(gitRepoAccessTokens.instance_id, instanceId),
          isNull(gitRepoAccessTokens.revoked_at),
        ),
      );
  } catch (error) {
    console.error(
      `Could not load Git access tokens for terminated instance ${instanceId}`,
      error,
    );
    return;
  }

  for (const token of tokens) {
    try {
      await addGitRepoAccessTokenRevocationJob({
        tokenId: token.id,
        reason: "instance-terminated",
      });
    } catch (error) {
      console.error(
        `Could not queue Git access token ${token.id} after instance termination`,
        error,
      );
    }
  }
};
const terminateVmInstance = async ({
  instance,
}: {
  instance: typeof instances.$inferSelect;
}): Promise<TerminationUsage> => {
  const [instanceTypeWithRegion] = await db
    .select()
    .from(instanceTypes)
    .innerJoin(instanceRegions, eq(instanceRegions.id, instanceTypes.region_id))
    .where(eq(instanceTypes.id, instance.instance_type_id!));

  const instanceType = instanceTypeWithRegion?.instance_types;
  const instanceRegion = instanceTypeWithRegion?.instance_regions;

  if (!instanceType || !instanceRegion)
    throw new AppError("Invalid request", 400);

  const networkOutInGb = await getProviderOutboundNetworkUsage({
    provider: instanceType.provider,
    region: instanceRegion.slug,
    instanceId: instance.provider_instance_id,
    startTime: instance.started_at ?? instance.created_at,
    endTime: new Date(),
  });

  // Both providers return the same semantic termination response.
  const terminationResponse = await terminateProviderInstance({
    provider: instanceType.provider,
    region: instanceRegion.slug,
    instanceId: instance.provider_instance_id,
    runtime: instance.runtime_kind,
  });

  if (!terminationResponse.terminated)
    throw new AppError("Failed to terminate instance", 502);

  // Calculate the uptime.
  const uptimeInMin = Math.ceil(
    (Date.now() - instance.started_at!.getTime()) / 1000 / 60,
  );
  const costEachMin = Math.ceil(instanceType.price_per_hour / 60);

  // Costs use the internal 10^7 fixed-point representation.
  // TODO: Make the network charge rate dynamic.
  const networkCharges = networkOutInGb * 0.13 * INTERNAL_MONEY_SCALE;
  return {
    networkCharges,
    uptimeInMin,
    totalCostWithProfit: calculateTotalCostWithProfit({
      costEachMin,
      uptimeInMin,
      networkCharges,
    }),
    networkOutInGb,
    ratePerSecond: Math.ceil(instanceType.price_per_hour / 3600),
  };
};

const terminateSandboxInstance = async ({
  instance,
}: {
  instance: typeof instances.$inferSelect;
}): Promise<TerminationUsage> => {
  const networkOutInGb = 0;
  // Both providers return the same semantic termination response.
  const [sandboxWithRegion] = await db
    .select()
    .from(sandboxTypes)
    .innerJoin(
      sandboxRegions,
      eq(sandboxRegions.id, sandboxTypes.sandbox_region),
    )
    .where(eq(sandboxTypes.id, instance.sandbox_type_id!));

  const sandbox = sandboxWithRegion?.sandbox_types;
  const sandboxRegion = sandboxWithRegion?.sandbox_regions;
  if (!sandbox || !sandboxRegion) throw new AppError("Sandbox not found ", 404);

  const terminationResponse = await terminateProviderInstance({
    provider: sandbox.provider,
    region: sandboxRegion.slug,
    instanceId: instance.provider_instance_id,
    runtime: instance.runtime_kind,
  });

  if (!terminationResponse.terminated)
    throw new AppError("Failed to terminate instance", 502);

  // Calculate the uptime.
  const uptimeInMin = Math.ceil(
    (Date.now() - instance.started_at!.getTime()) / 1000 / 60,
  );

  const networkCharges = 0;

  return {
    networkCharges,
    uptimeInMin,
    totalCostWithProfit: calculateSandboxUsageCost({
      pricePerSecond: sandbox.price_per_second,
      uptimeInMin,
    }),
    networkOutInGb,
    ratePerSecond: sandbox.price_per_second,
  };
};

export const calculateSandboxUsageCost = ({
  pricePerSecond,
  uptimeInMin,
}: {
  pricePerSecond: number;
  uptimeInMin: number;
}) => {
  const MIN_CHARGE = Math.ceil(0.0001 * INTERNAL_MONEY_SCALE);

  // Step 1: convert stored price back to a real $/second value
  const pricePerSecondInDollars = pricePerSecond / INTERNAL_MONEY_SCALE;

  // Step 2: all math in real dollars, no scaling yet
  const costEachMin = pricePerSecondInDollars * 60;
  const totalCost = costEachMin * uptimeInMin;
  const profit = totalCost * (env.PROFIT_PRECENTAGE / 100);
  const totalCostWithProfit = totalCost + profit; // still real dollars

  // Step 3: scale to the internal 10^7 integer representation.
  const scaled = Math.ceil(totalCostWithProfit * INTERNAL_MONEY_SCALE);
  return scaled < MIN_CHARGE ? MIN_CHARGE : scaled;
};

/**
 * Terminates a session by instance ID and session ID, then charges the user.
 */
export const terminateInstanceAndChargeUsageWithInstanceIdAndSessionId =
  async ({
    instanceId,
    sessionId,
  }: TerminateInstanceAndChargeUsageWithSessionProps) => {
    const [instance] = await db
      .select()
      .from(instances)
      .where(
        and(
          eq(instances.id, instanceId),
          eq(instances.project_session_id, sessionId),
        ),
      );
    if (!instance) throw new AppError("Instance not found", 404);

    return await terminateInstanceAndChargeUsage({
      instanceId: instanceId,
      userId: instance.user_id,
    });
  };
