import {
  and,
  db,
  eq,
  paymentGatewayTransactions,
  sql,
  users,
  userWallet,
  userWalletCredits,
  userWalletTransactions,
} from "@repo/db";
import { dodoPaymentClient } from "./dodo-payments.js";
import { Request, Response } from "express";

function formatToPrecissionAmount(amount: number): number {
  return amount * 100;
}

const firstHeaderValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const dodoPaymentsWebhook = async (req: Request, res: Response) => {
  try {
    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ message: "Invalid Dodo webhook payload" });
      return;
    }

    const rawBody = req.body.toString("utf8");
    const unwrapped = dodoPaymentClient.webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": firstHeaderValue(req.headers["webhook-id"]) ?? "",
        "webhook-signature":
          firstHeaderValue(req.headers["webhook-signature"]) ?? "",
        "webhook-timestamp":
          firstHeaderValue(req.headers["webhook-timestamp"]) ?? "",
      },
    });

    if (unwrapped.type === "payment.succeeded") {
      const checkoutSessionId = unwrapped.data.checkout_session_id;

      if (!checkoutSessionId) {
        res.status(200).json({
          received: true,
          from: "payment-succeeded-missing-checkout-session-id",
        });
        return;
      }

      const [paymentAndUserDbRow] = await db
        .select()
        .from(paymentGatewayTransactions)
        .leftJoin(users, eq(users.id, paymentGatewayTransactions.user_id))
        .where(eq(paymentGatewayTransactions.sessionId, checkoutSessionId));

      if (!paymentAndUserDbRow || !paymentAndUserDbRow.users) {
        res.status(200).json({
          received: true,
          from: "payment-succeeded-transaction-or-user-not-found",
        });
        return;
      }
      const { users: user } = paymentAndUserDbRow;

      const { settlement_amount, settlement_currency, settlement_tax } =
        unwrapped.data;

      if (
        settlement_amount == null ||
        settlement_currency == null ||
        settlement_tax == null
      ) {
        res.status(200).json({
          received: true,
          from: "payment-succeeded-missing-settlement-data",
        });
        return;
      }

      const receivedAmountAfterTax = settlement_amount - settlement_tax;
      if (receivedAmountAfterTax <= 0) {
        res.status(200).json({
          received: true,
          from: "payment-succeeded-non-positive-settlement-amount",
        });
        return;
      }

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await db.transaction(async (tx) => {
        // precision amount is not needed here
        const [updatedPaymentGatewayTransaction] = await tx
          .update(paymentGatewayTransactions)
          .set({
            status: "success",
            amount: receivedAmountAfterTax,
            completed_at: new Date(),
            raw: JSON.stringify(unwrapped),
          })
          .where(
            and(
              eq(paymentGatewayTransactions.sessionId, checkoutSessionId),
              eq(paymentGatewayTransactions.status, "pending"),
            ),
          )
          .returning();

        if (!updatedPaymentGatewayTransaction) return;

        // precision amount is required here
        const [updatedUserWallet] = await tx
          .update(userWallet)
          .set({
            balance: sql`${userWallet.balance} + ${formatToPrecissionAmount(receivedAmountAfterTax)}`,
          })
          .where(eq(userWallet.user_id, user.id))
          .returning();
        if (!updatedUserWallet) throw new Error("User wallet not found");

        // precision amount is required
        const [userWalletCredit] = await tx
          .insert(userWalletCredits)
          .values({
            user_id: user.id,
            balance: formatToPrecissionAmount(receivedAmountAfterTax),
            total_balance: formatToPrecissionAmount(receivedAmountAfterTax),
            wallet_id: updatedUserWallet.id,
            description: "User topup",
            expires_at: expiresAt,
          })
          .returning();

        if (!userWalletCredit) throw new Error("Wallet credit was not created");
        await tx.insert(userWalletTransactions).values({
          transaction_type: "deposit",
          wallet_id: updatedUserWallet.id,
          description: "User topup",
          raw_description: `Payment using dodopayments sessionId: ${checkoutSessionId} currency: ${settlement_currency} settlement_amount: ${settlement_amount} tax: ${settlement_tax}`,
          amount: formatToPrecissionAmount(receivedAmountAfterTax),
          user_wallet_credit_id: userWalletCredit.id,
        });
      });
    }
    res.status(200).json({
      received: true,
      from: "webhook-handled",
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Invalid Dodo webhook" });
  }
};
