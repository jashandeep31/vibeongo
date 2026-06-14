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

interface terminateInstanceAndChargeUsageProps {
  instanceId: string;
  userId: string;
}

interface terminateInstanceAndChargeUsageWithInstanceIdAndSessionId {
  instanceId: string;
  sessionId: string;
}
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

export const terminateInstanceAndChargeUsage = async ({
  instanceId,
  userId,
}: terminateInstanceAndChargeUsageProps) => {
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

  const awsResponse = await terminateEc2Instance(
    instanceWithTypeAndRegion.instance_regions.slug,
    [instance.aws_instance_id],
  );
  if (awsResponse.$metadata.httpStatusCode !== 200)
    throw new AppError("Failed to terminate instance", 500);

  const uptimeInMin = Math.ceil(
    (Date.now() - instance.started_at!.getTime()) / 1000 / 60,
  );

  const coastEachMin = Math.ceil(
    instanceWithTypeAndRegion.instance_types.price_per_hour / 60,
  );

  const totalCostWithProfit = (): number => {
    const totalCost = coastEachMin * uptimeInMin;
    const profit = totalCost * (env.PROFIT_PRECENTAGE / 100);
    const totalCostWithProfit = totalCost + profit;
    return totalCostWithProfit < 0.0002 * 10000
      ? 2
      : Math.ceil(totalCostWithProfit);
  };

  await db.transaction(async (tx) => {
    const totalCost = totalCostWithProfit();
    const [userWalletRow] = await tx
      .update(userWallet)
      .set({
        balance: sql`balance - ${totalCost}`,
      })
      .where(eq(userWallet.user_id, userId))
      .returning();
    if (!userWalletRow) throw new AppError("User wallet not found", 404);
    const userCreditWalletRows = await tx
      .select()
      .from(userWalletCredits)
      .where(
        and(
          eq(userWalletCredits.user_id, userId),
          eq(userWalletCredits.expired, false),
          gt(userWalletCredits.balance, 0),
        ),
      )
      .orderBy(asc(userWalletCredits.expires_at));

    let pendingAmount = totalCost;
    for (const creditWallet of userCreditWalletRows) {
      if (pendingAmount <= 0) break;
      const amountToUse = Math.min(pendingAmount, creditWallet.balance);
      pendingAmount -= amountToUse;
      await tx
        .update(userWalletCredits)
        .set({
          balance: sql`balance - ${amountToUse}`,
        })
        .where(eq(userWalletCredits.id, creditWallet.id));

      await tx.insert(userWalletTransactions).values({
        wallet_id: userWalletRow.id,
        transaction_type: "spent",
        description: `Instance usage ${instanceId}`,
        raw_description: `Charged for instance usage ${instanceId} for uptime: ${uptimeInMin}  in min. ${amountToUse} is charged`,
        amount: amountToUse,
        user_wallet_credit_id: creditWallet.id,
      });
    }
    await tx
      .update(instances)
      .set({
        terminated_at: new Date(),
        state: "terminated",
        session_cost: totalCost,
      })
      .where(eq(instances.id, instanceId));
    if (instance.project_id) {
      await tx
        .update(projects)
        .set({
          total_charges: sql`${projects.total_charges} + ${totalCost}`,
        })
        .where(eq(projects.id, instance.project_id));
    }
  });
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
