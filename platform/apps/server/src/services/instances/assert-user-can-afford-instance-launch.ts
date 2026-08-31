import {
  eq,
  instanceTypes,
  sandboxTypes,
  type Transaction,
  userWallet,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";
import type { InstanceRuntime } from "../../providers/types.js";

export const assertUserCanAffordInstanceLaunch = async ({
  tx,
  userId,
  runtime,
  instanceTypeId,
  sandboxTypeId,
}: {
  tx: Transaction;
  userId: string;
  runtime: InstanceRuntime;
  instanceTypeId: string | null;
  sandboxTypeId: string | null;
}) => {
  const [wallet] = await tx
    .select()
    .from(userWallet)
    .where(eq(userWallet.user_id, userId))
    .for("update");

  if (!wallet) {
    throw new AppError("User wallet not found", 404);
  }

  let eightHourCost: number;
  if (runtime === "vm") {
    if (!instanceTypeId) {
      throw new AppError("VM instance type not found", 404);
    }

    const [instanceType] = await tx
      .select({ pricePerHour: instanceTypes.price_per_hour })
      .from(instanceTypes)
      .where(eq(instanceTypes.id, instanceTypeId));

    if (!instanceType) {
      throw new AppError("VM instance type not found", 404);
    }

    eightHourCost = instanceType.pricePerHour * 8;
  } else {
    if (!sandboxTypeId) {
      throw new AppError("Sandbox type not found", 404);
    }

    const [sandboxType] = await tx
      .select({ pricePerSecond: sandboxTypes.price_per_seconds })
      .from(sandboxTypes)
      .where(eq(sandboxTypes.id, sandboxTypeId));

    if (!sandboxType) {
      throw new AppError("Sandbox type not found", 404);
    }

    eightHourCost = sandboxType.pricePerSecond * 60 * 60 * 8;
  }

  const requiredBalance = Math.ceil(
    eightHourCost + eightHourCost * (env.PROFIT_PRECENTAGE / 100),
  );

  if (wallet.balance < requiredBalance) {
    throw new AppError(
      `Insufficient balance required is ${requiredBalance} you have ${wallet.balance}`,
      400,
    );
  }
};
