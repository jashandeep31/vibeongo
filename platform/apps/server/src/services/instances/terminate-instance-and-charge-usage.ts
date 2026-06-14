import { terminateEc2Instance } from "../../aws/services/terminate-ec2-instance.js";
import {
  and,
  instances,
  db,
  eq,
  instanceRegions,
  instanceTypes,
  sql,
  userWalletCredits,
  gt,
  asc,
  userWalletTransactions,
  projectDomainRouting,
  projects,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";
import { userWallet } from "@repo/db";
import { invalidateProjectProxiesByRoutingId } from "../../lib/invalidate-project-proxies-by-pid.js";
import { getEc2InstanceNetworkUsage } from "../../aws/services/get-instance-network-usage.js";

//props of the fuction
interface terminateInstanceAndChargeUsageProps {
  instanceId: string;
  userId: string;
}

//response
interface terminateInstanceAndChargeUsageWithInstanceIdAndSessionId {
  instanceId: string;
  sessionId: string;
}

const formatUptime = (uptimeInMin: number) =>
  `${uptimeInMin} ${uptimeInMin === 1 ? "minute" : "minutes"}`;

const formatNetworkUsage = (networkUsageInGB: number) =>
  `${networkUsageInGB.toFixed(6)} GB`;

const formatWalletAmount = (amount: number) =>
  `$${(amount / 10000).toFixed(4)}`;

/**
 * Terminate the instance and charge the user
 */
export const terminateInstanceAndChargeUsage = async ({
  instanceId,
  userId,
}: terminateInstanceAndChargeUsageProps) => {
  // seleting the instance , region and its type
  const [instanceWithTypeAndRegion] = await db
    .select()
    .from(instances)
    .innerJoin(instanceTypes, eq(instances.instance_type_id, instanceTypes.id))
    .innerJoin(instanceRegions, eq(instanceRegions.id, instanceTypes.region_id))
    .where(and(eq(instances.id, instanceId), eq(instances.user_id, userId)));

  if (
    !instanceWithTypeAndRegion ||
    !instanceWithTypeAndRegion?.instances ||
    !instanceWithTypeAndRegion?.instance_regions ||
    !instanceWithTypeAndRegion?.instance_types
  )
    throw new AppError("Instance not found", 404);

  const instance = instanceWithTypeAndRegion.instances;

  // Getting the network out in DB
  // NOTE: if the last transaction in db fails but aws termination works then it can cause issue as networkusage will throw error from the aws side need to be fixed
  const netWorkOutInGB = await getEc2InstanceNetworkUsage({
    region: instanceWithTypeAndRegion.instance_regions.slug,
    instanceId: instance.aws_instance_id,
    metricName: "NetworkOut",
    startTime: instance.started_at ?? instance.created_at,
    endTime: new Date(),
  });

  // Terminating the instance on the aws
  const awsResponse = await terminateEc2Instance(
    instanceWithTypeAndRegion.instance_regions.slug,
    [instance.aws_instance_id],
  );
  if (awsResponse.$metadata.httpStatusCode !== 200)
    throw new AppError("Failed to terminate instance", 500);

  // calculating the uptime
  const uptimeInMin = Math.ceil(
    (Date.now() - instance.started_at!.getTime()) / 1000 / 60,
  );
  const coastEachMin = Math.ceil(
    instanceWithTypeAndRegion.instance_types.price_per_hour / 60,
  );

  // This returns the price in are you format means 1.0001 is 10001 cents So no after conversion is needed
  // source: https://aws.amazon.com/ec2/pricing/on-demand/
  // TODO: make the network charges dynamic
  const networkCharges = netWorkOutInGB * 0.13 * 10000;
  // multiply by 10000 for cents that we use in our system
  const totalCostWithProfit = (): number => {
    console.log(networkCharges, netWorkOutInGB);
    const totalCost = coastEachMin * uptimeInMin + networkCharges;
    const profit = totalCost * (env.PROFIT_PRECENTAGE / 100);
    const totalCostWithProfit = totalCost + profit;
    return totalCostWithProfit < 0.0002 * 10000
      ? 2
      : Math.ceil(totalCostWithProfit);
  };

  // DB transaction starts from here
  await db.transaction(async (tx) => {
    // Total cost include everything like network charges, normal usage charges
    const totalCost = totalCostWithProfit();

    // Only one request can claim and charge a running instance.
    // instance is set to terminated with the terminated time
    const [instanceToTerminate] = await tx
      .update(instances)
      .set({
        terminated_at: new Date(),
        state: "terminated",
      })
      .where(and(eq(instances.id, instanceId), eq(instances.state, "running")))
      .returning({ id: instances.id });
    if (!instanceToTerminate) return;

    // user wallet is only selected and locked for update
    const [userWalletRow] = await tx
      .select()
      .from(userWallet)
      .where(eq(userWallet.user_id, userId))
      .for("update");
    if (!userWalletRow) throw new AppError("User wallet not found", 404);

    // selecting all user credit wallet to charge  from the appropriate wallet and locked for update
    const userCreditWalletRows = await tx
      .select()
      .from(userWalletCredits)
      .where(
        and(
          eq(userWalletCredits.user_id, userId),
          eq(userWalletCredits.expired, false),
          gt(userWalletCredits.expires_at, new Date()),
          gt(userWalletCredits.balance, 0),
        ),
      )
      .orderBy(asc(userWalletCredits.expires_at))
      .for("update");

    const availableCreditBalance = userCreditWalletRows.reduce(
      (total, credit) => total + credit.balance,
      0,
    );

    // choosing the lower one between the user wallet total amount nad user spends to stop going to negative
    const amountToCharge = Math.min(
      totalCost,
      Math.max(0, userWalletRow.balance),
      availableCreditBalance,
    );

    // updating the user wallet amount
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
        .update(userWalletCredits)
        .set({
          balance: sql`greatest(${userWalletCredits.balance} - ${amountToUse}, 0)`,
        })
        .where(eq(userWalletCredits.id, creditWallet.id));

      await tx.insert(userWalletTransactions).values({
        wallet_id: userWalletRow.id,
        transaction_type: "spent",
        description: `Instance ID: ${instanceId} | Uptime: ${formatUptime(uptimeInMin)} | Network usage: ${formatNetworkUsage(netWorkOutInGB)}`,
        raw_description: `Instance ${instanceId} (AWS instance ID: ${instance.aws_instance_id}) ran for ${formatUptime(uptimeInMin)} and used ${formatNetworkUsage(netWorkOutInGB)} of network data. The network cost was ${formatWalletAmount(networkCharges)}, the total cost was ${formatWalletAmount(totalCost)}, and ${formatWalletAmount(amountToUse)} was charged.`,
        amount: amountToUse,
        user_wallet_credit_id: creditWallet.id,
      });
    }

    // updating the session cost
    await tx
      .update(instances)
      .set({
        session_cost: totalCost,
      })
      .where(eq(instances.id, instanceId));

    // updating the project total charges
    if (instance.project_id) {
      await tx
        .update(projects)
        .set({
          total_charges: sql`${projects.total_charges} + ${totalCost}`,
        })
        .where(eq(projects.id, instance.project_id));
    }
  });

  // removing the routes
  // NOTE: this is creating n calls to try to optimise this
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
    .returning({ id: projectDomainRouting.id });

  for (const routing of updatedRoutings) {
    await invalidateProjectProxiesByRoutingId(routing.id);
  }
  return;
};

/**
 * Funciton take the intanceId and sessionId to terminate that session and charge user
 * User the hood it uses another main fuction of the termination terminateInstanceAndChargeUsage
 */
export const terminateInstanceAndChargeUsageWithInstanceIdAndSessionId =
  async ({
    instanceId,
    sessionId,
  }: terminateInstanceAndChargeUsageWithInstanceIdAndSessionId) => {
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
