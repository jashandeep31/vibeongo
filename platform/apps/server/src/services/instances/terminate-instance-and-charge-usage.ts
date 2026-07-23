import {
  and,
  instances,
  db,
  eq,
  instanceRegions,
  instanceTypes,
  sql,
  userCreditGrants,
  gt,
  asc,
  userWalletTransactions,
  projectDomainRouting,
  projects,
  sandboxTypes,
  sandboxRegions,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";
import { userWallet } from "@repo/db";
// import { getEc2InstanceNetworkUsage } from "../../providers/aws/services/get-instance-network-usage.js";
import { invalidateProjectProxiesByPid } from "../../lib/invalidate-project-proxies-by-pid.js";
import { terminateProviderInstance } from "../../providers/terminate-providers-instance.js";
import { getProviderOutboundNetworkUsage } from "../../providers/get-provider-outbound-network-usage.js";

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
}

const formatUptime = (uptimeInMin: number) =>
  `${uptimeInMin} ${uptimeInMin === 1 ? "minute" : "minutes"}`;

const formatNetworkUsage = (networkUsageInGb: number) =>
  `${networkUsageInGb.toFixed(6)} GB`;

const formatWalletAmount = (amount: number) =>
  `$${(amount / 10000).toFixed(4)}`;

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

  return totalCostWithProfit < 0.0002 * 10000
    ? 2
    : Math.ceil(totalCostWithProfit);
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

  const { totalCostWithProfit, networkCharges, uptimeInMin, networkOutInGb } =
    instance.runtime_kind === "vm"
      ? await terminateVmInstance({
          instance: instance,
        })
      : await terminateSandboxInstance({
          instance: instance,
        });

  // Start the database transaction.
  await db.transaction(async (tx) => {
    // Total cost includes network charges and normal usage charges.
    const totalCost = totalCostWithProfit;

    // Only one request can claim and charge a running instance.
    // Mark the instance as terminated with the termination time.
    const [instanceToTerminate] = await tx
      .update(instances)
      .set({
        terminated_at: new Date(),
        state: "terminated",
      })
      .where(and(eq(instances.id, instanceId), eq(instances.state, "running")))
      .returning({ id: instances.id });
    if (!instanceToTerminate) return;

    // Select and lock the user wallet for update.
    const [userWalletRow] = await tx
      .select()
      .from(userWallet)
      .where(eq(userWallet.user_id, userId))
      .for("update");
    if (!userWalletRow) throw new AppError("User wallet not found", 404);

    // Select and lock all available credit wallets for update.
    const userCreditWalletRows = await tx
      .select()
      .from(userCreditGrants)
      .where(
        and(
          eq(userCreditGrants.user_id, userId),
          eq(userCreditGrants.expired, false),
          gt(userCreditGrants.expires_at, new Date()),
          gt(userCreditGrants.balance, 0),
        ),
      )
      .orderBy(asc(userCreditGrants.expires_at))
      .for("update");

    const availableCreditBalance = userCreditWalletRows.reduce(
      (total, credit) => total + credit.balance,
      0,
    );

    // Prevent the charge from exceeding either wallet's available balance.
    const amountToCharge = Math.min(
      totalCost,
      Math.max(0, userWalletRow.balance),
      availableCreditBalance,
    );

    // Update the user wallet amount.
    await tx
      .update(userWallet)
      .set({
        balance: sql`greatest(${userWallet.balance} - ${amountToCharge}, 0)`,
      })
      .where(eq(userWallet.id, userWalletRow.id));

    let pendingAmount = amountToCharge;
    for (const creditWallet of userCreditWalletRows) {
      if (pendingAmount <= 0) break;
      const amountToUse = Math.min(pendingAmount, creditWallet.balance);
      pendingAmount -= amountToUse;
      await tx
        .update(userCreditGrants)
        .set({
          balance: sql`greatest(${userCreditGrants.balance} - ${amountToUse}, 0)`,
        })
        .where(eq(userCreditGrants.id, creditWallet.id));

      await tx.insert(userWalletTransactions).values({
        wallet_id: userWalletRow.id,
        transaction_type: "spent",
        description: `Instance ID: ${instanceId}| ENV: ${instance.runtime_kind} | Uptime: ${formatUptime(uptimeInMin)} | Network usage: ${formatNetworkUsage(networkOutInGb)}  `,
        raw_description: `Instance ${instanceId} ${instance.instance_type_id || instance.sandbox_type_id}  ran for ${formatUptime(uptimeInMin)} and used ${formatNetworkUsage(networkOutInGb)} of network data. The network cost was ${formatWalletAmount(networkCharges)}, the total cost was ${formatWalletAmount(totalCost)}, and ${formatWalletAmount(amountToUse)} was charged.`,
        amount: amountToUse,
        user_wallet_credit_id: creditWallet.id,
      });
    }

    // Update the session cost.
    await tx
      .update(instances)
      .set({
        session_cost: totalCost,
      })
      .where(eq(instances.id, instanceId));

    // Update the project's total charges.
    if (instance.project_id) {
      await tx
        .update(projects)
        .set({
          total_charges: sql`${projects.total_charges} + ${totalCost}`,
        })
        .where(eq(projects.id, instance.project_id));
    }
  });

  // Remove the routes and invalidate affected project proxies.
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
  return;
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

  // Costs are stored in ten-thousandths of a dollar.
  // TODO: Make the network charge rate dynamic.
  const networkCharges = networkOutInGb * 0.13 * 10000;
  return {
    networkCharges,
    uptimeInMin,
    totalCostWithProfit: calculateTotalCostWithProfit({
      costEachMin,
      uptimeInMin,
      networkCharges,
    }),
    networkOutInGb,
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
  const costEachMin = 100;

  const networkCharges = 0;
  return {
    networkCharges,
    uptimeInMin,
    totalCostWithProfit: calculateTotalCostWithProfit({
      costEachMin,
      uptimeInMin,
      networkCharges,
    }),
    networkOutInGb,
  };
};

/**
 * Terminates a session by instance ID and session ID, then charges the user.
 */
export const terminateInstanceAndChargeUsageWithInstanceIdAndSessionId =
  async ({
    instanceId,
    sessionId,
  }: TerminateInstanceAndChargeUsageWithSessionProps) => {
    const where =
      sessionId === "iawareofshit"
        ? eq(instances.id, instanceId)
        : and(
            eq(instances.id, instanceId),
            eq(instances.project_session_id, sessionId),
          );

    const [instance] = await db.select().from(instances).where(where);
    if (!instance) throw new AppError("Instance not found", 404);

    return await terminateInstanceAndChargeUsage({
      instanceId: instanceId,
      userId: instance.user_id,
    });
  };
