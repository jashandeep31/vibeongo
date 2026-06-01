import { terminateEc2Instance } from "../../aws/services/terminate-ec2-instance.js";
import {
  and,
  instances,
  db,
  users,
  eq,
  instanceRegions,
  instanceTypes,
  sql,
  userWalletCredits,
  gt,
  asc,
  userWalletTransactions,
  projectDomainRouting,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";
import { userWallet } from "@repo/db";
import { invalidateProjectProxiesByRoutingId } from "../../lib/invalidate-project-proxies-by-pid.js";

interface terminateInstanceAndChargeUsageProps {
  instanceId: string;
  userId: string;
}

export const terminateInstanceAndChargeUsage = async ({
  instanceId,
  userId,
}: terminateInstanceAndChargeUsageProps) => {
  const [row] = await db
    .select()
    .from(instances)
    .innerJoin(instanceTypes, eq(instances.instance_type_id, instanceTypes.id))
    .innerJoin(instanceRegions, eq(instanceRegions.id, instanceTypes.region_id))
    .where(and(eq(instances.id, instanceId), eq(instances.user_id, userId)));

  if (!row || !row?.instances || !row?.instance_regions || !row?.instance_types)
    throw new AppError("Instance not found", 404);

  const awsResponse = await terminateEc2Instance(row.instance_regions.slug, [
    row.instances.aws_instance_id,
  ]);
  if (awsResponse.$metadata.httpStatusCode !== 200)
    throw new AppError("Failed to terminate instance", 500);

  const uptimeInMin = Math.ceil(
    (Date.now() - row.instances.started_at!.getTime()) / 1000 / 60,
  );

  const coastEachMin = Math.ceil(row.instance_types.price_per_hour / 60);
  console.log(coastEachMin, uptimeInMin);

  const totalCostWithProfit = (): number => {
    const totalCost = coastEachMin * uptimeInMin;
    const profit = totalCost * (env.PROFIT_PRECENTAGE / 100);
    const totalCostWithProfit = totalCost + profit;
    return totalCostWithProfit < 0.0002 * 10000 ? 2 : totalCostWithProfit;
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
        description: "Instance usage",
        amount: amountToUse,
        user_wallet_credit_id: creditWallet.id,
      });
    }
    await tx
      .update(instances)
      .set({ terminated_at: new Date(), state: "terminated" })
      .where(eq(instances.id, instanceId));
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
