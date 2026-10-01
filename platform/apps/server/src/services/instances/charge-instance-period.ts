import {
  and,
  asc,
  eq,
  gt,
  instancePeriods,
  instances,
  sql,
  type Transaction,
  userCreditGrants,
  userWallet,
  userWalletTransactions,
} from "@repo/db";
import { formatInternalMoney, INTERNAL_MONEY_SCALE } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";

export type InstanceChargeEvent = "suspended" | "resumed" | "terminated";

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

const formatDataSize = (sizeInGb: number) =>
  sizeInGb >= 1
    ? `${sizeInGb.toFixed(2)} GB`
    : `${Math.max(1, Math.round(sizeInGb * 1024))} MB`;

const formatAiCharges = (amount: number) => {
  const dollars = amount / INTERNAL_MONEY_SCALE;
  if (dollars >= 0.01) return `$${dollars.toFixed(2)}`;
  if (dollars >= 0.001) return `$${dollars.toFixed(3)}`;
  return "<$0.001";
};

const getPeriodMinutes = (startedAt: Date, endedAt: Date) =>
  Math.max(0, Math.ceil((endedAt.getTime() - startedAt.getTime()) / 1000 / 60));

export const formatPeriodDescription = ({
  kind,
  runtimeKind,
  minutes,
  networkOutGb,
  aiAmount,
  event,
}: {
  kind: "running" | "suspended";
  runtimeKind: string;
  minutes: number;
  networkOutGb: number;
  aiAmount: number;
  event: InstanceChargeEvent;
}) =>
  [
    runtimeKind === "vm" ? "VM" : "Sandbox",
    kind === "suspended"
      ? `suspended ${formatDuration(minutes)}`
      : formatDuration(minutes),
    networkOutGb > 0 && `${formatDataSize(networkOutGb)} network`,
    aiAmount > 0 && `${formatAiCharges(aiAmount)} AI`,
    event,
  ]
    .filter(Boolean)
    .join(" · ");

export const chargeInstancePeriod = async ({
  tx,
  periodId,
  instance,
  endedAt,
  computeAmount = 0,
  aiAmount = 0,
  networkAmount = 0,
  networkOutGb = 0,
  storageAmount = 0,
  event,
}: {
  tx: Transaction;
  periodId: string;
  instance: typeof instances.$inferSelect;
  endedAt: Date;
  computeAmount?: number;
  aiAmount?: number;
  networkAmount?: number;
  networkOutGb?: number;
  storageAmount?: number;
  event: InstanceChargeEvent;
}) => {
  const [period] = await tx
    .select()
    .from(instancePeriods)
    .where(eq(instancePeriods.id, periodId))
    .for("update");
  if (!period) throw new AppError("Instance period not found", 404);
  if (period.charged_at) return 0;

  const totalAmount = Math.ceil(
    computeAmount + aiAmount + networkAmount + storageAmount,
  );
  const minutes = getPeriodMinutes(period.started_at, endedAt);
  const description = formatPeriodDescription({
    kind: period.kind,
    runtimeKind: instance.runtime_kind,
    minutes,
    networkOutGb,
    aiAmount,
    event,
  });

  const [wallet] = await tx
    .select()
    .from(userWallet)
    .where(eq(userWallet.user_id, instance.user_id))
    .for("update");
  if (!wallet) throw new AppError("User wallet not found", 404);

  const creditGrants = await tx
    .select()
    .from(userCreditGrants)
    .where(
      and(
        eq(userCreditGrants.user_id, instance.user_id),
        eq(userCreditGrants.expired, false),
        gt(userCreditGrants.expires_at, new Date()),
        gt(userCreditGrants.balance, 0),
      ),
    )
    .orderBy(asc(userCreditGrants.expires_at))
    .for("update");

  const availableCredit = creditGrants.reduce(
    (total, grant) => total + grant.balance,
    0,
  );
  const amountToCharge = Math.min(
    totalAmount,
    Math.max(0, wallet.balance),
    availableCredit,
  );

  if (amountToCharge > 0) {
    await tx
      .update(userWallet)
      .set({
        balance: sql`greatest(${userWallet.balance} - ${amountToCharge}, 0)`,
      })
      .where(eq(userWallet.id, wallet.id));
  }

  let pendingAmount = amountToCharge;
  for (const grant of creditGrants) {
    if (pendingAmount <= 0) break;
    const amountToUse = Math.min(pendingAmount, grant.balance);
    pendingAmount -= amountToUse;
    await tx
      .update(userCreditGrants)
      .set({
        balance: sql`greatest(${userCreditGrants.balance} - ${amountToUse}, 0)`,
      })
      .where(eq(userCreditGrants.id, grant.id));

    await tx.insert(userWalletTransactions).values({
      wallet_id: wallet.id,
      transaction_type: "spent",
      description,
      raw_description: `Instance ${instance.id} ${instance.instance_type_id || instance.sandbox_type_id} ${period.kind} period ${period.id} ${event}: ${minutes} minutes, compute $${formatInternalMoney(computeAmount)}, AI $${formatInternalMoney(aiAmount)}, network ${networkOutGb.toFixed(6)} GB $${formatInternalMoney(networkAmount)}, storage $${formatInternalMoney(storageAmount)}, total $${formatInternalMoney(totalAmount)}, charged $${formatInternalMoney(amountToUse)}.`,
      amount: amountToUse,
      user_wallet_credit_id: grant.id,
    });
  }

  await tx
    .update(instancePeriods)
    .set({
      ended_at: endedAt,
      compute_amount: Math.ceil(computeAmount),
      ai_amount: Math.ceil(aiAmount),
      network_amount: Math.ceil(networkAmount),
      network_out_gb: networkOutGb,
      storage_amount: Math.ceil(storageAmount),
      amount: totalAmount,
      charged_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(instancePeriods.id, period.id));

  return amountToCharge;
};

export const openInstancePeriod = async ({
  tx,
  instanceId,
  kind,
  startedAt,
  ratePerSecond,
}: {
  tx: Transaction;
  instanceId: string;
  kind: "running" | "suspended";
  startedAt: Date;
  ratePerSecond: number;
}) => {
  const [period] = await tx
    .insert(instancePeriods)
    .values({
      instance_id: instanceId,
      kind,
      started_at: startedAt,
      rate_per_second: ratePerSecond,
    })
    .returning({ id: instancePeriods.id });
  if (!period) throw new AppError("Could not open an instance period", 500);
  return period.id;
};

export const getOrOpenRunningPeriod = async ({
  tx,
  instance,
  ratePerSecond,
}: {
  tx: Transaction;
  instance: typeof instances.$inferSelect;
  ratePerSecond: number;
}) => {
  const [openPeriod] = await tx
    .select({ id: instancePeriods.id, kind: instancePeriods.kind })
    .from(instancePeriods)
    .where(
      and(
        eq(instancePeriods.instance_id, instance.id),
        sql`${instancePeriods.ended_at} IS NULL`,
      ),
    )
    .for("update");

  if (openPeriod?.kind === "running") return openPeriod.id;
  if (openPeriod) {
    throw new AppError("The instance has an open suspended period", 409);
  }

  return openInstancePeriod({
    tx,
    instanceId: instance.id,
    kind: "running",
    startedAt: instance.started_at,
    ratePerSecond,
  });
};
