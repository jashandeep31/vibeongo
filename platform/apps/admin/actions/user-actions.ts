"use server";

import { checkAdmin } from "@/lib/get-session";
import {
  accounts,
  db,
  eq,
  sql,
  userCreditGrants,
  userWallet,
  userWalletTransactions,
} from "@repo/db";
import { revalidatePath } from "next/cache";

type AccountStatus = "active" | "banned";

export const verifyUser = async (id: string, state: boolean) => {
  await checkAdmin();
  await db
    .update(accounts)
    .set({
      verified: state,
    })
    .where(eq(accounts.user_id, id));
  revalidatePath("/users");
  return true;
};

export const updateUserStatus = async (id: string, status: AccountStatus) => {
  await checkAdmin();

  await db
    .update(accounts)
    .set({
      status,
    })
    .where(eq(accounts.user_id, id));
  revalidatePath("/users");
  return true;
};

export const blockUser = async (id: string) => updateUserStatus(id, "banned");

export const userWalletTopUp = async (id: string, rawAmount: number) => {
  await checkAdmin();

  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    throw new Error("amount must be a positive number");
  }

  const amount = Math.ceil(rawAmount * 100) * 100;
  await db.transaction(async (tx) => {
    const [updatedWallet] = await tx
      .update(userWallet)
      .set({
        balance: sql`${userWallet.balance}+${amount}`,
      })
      .where(eq(userWallet.user_id, id))
      .returning();

    if (!updatedWallet) throw new Error("wallet not found");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const description = `Promotional wallet top-up | Amount credited: $${(amount / 10000).toFixed(2)}`;
    const [creditGrant] = await tx
      .insert(userCreditGrants)
      .values({
        user_id: id,
        balance: amount,
        total_balance: amount,
        wallet_id: updatedWallet.id,
        description,
        expires_at: expiresAt,
      })
      .returning();

    await tx.insert(userWalletTransactions).values({
      transaction_type: "deposit",
      wallet_id: updatedWallet.id,
      description,
      raw_description: `Admin promotional wallet top-up of $${(amount / 10000).toFixed(2)}. The wallet credit expires on ${expiresAt.toISOString()}.`,
      amount,
      user_wallet_credit_id: creditGrant.id,
    });
  });

  revalidatePath("/users");
};
