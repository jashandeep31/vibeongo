import {
  and,
  db,
  eq,
  paymentGatewayTransactions,
  sql,
  users,
  userWallet,
  userCreditGrants,
  userWalletTransactions,
} from "@repo/db";
import { dodoPaymentClient } from "./dodo-payments.js";
import { Request, Response } from "express";
import {
  PAYMENT_GATEWAY_SCALE,
  PAYMENT_GATEWAY_TO_INTERNAL_SCALE,
} from "@repo/shared";

function gatewayAmountToInternal(amount: number): number {
  return amount * PAYMENT_GATEWAY_TO_INTERNAL_SCALE;
}

const formatSettlementAmount = (amount: number, currency: string) =>
  `${(amount / PAYMENT_GATEWAY_SCALE).toFixed(2)} ${currency.toUpperCase()}`;

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

      const description = `Wallet top-up | Amount credited: ${formatSettlementAmount(receivedAmountAfterTax, settlement_currency)}`;
      const rawDescription = `Dodo Payments checkout session ${checkoutSessionId} completed successfully. The gross settlement amount was ${formatSettlementAmount(settlement_amount, settlement_currency)}, tax was ${formatSettlementAmount(settlement_tax, settlement_currency)}, and the net amount credited was ${formatSettlementAmount(receivedAmountAfterTax, settlement_currency)}. The wallet credit expires on ${expiresAt.toISOString()}.`;

      await db.transaction(async (tx) => {
        // Gateway transaction amounts remain in the gateway's smallest unit.
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

        // Wallet amounts use the internal 10^7 fixed-point representation.
        const [updatedUserWallet] = await tx
          .update(userWallet)
          .set({
            balance: sql`${userWallet.balance} + ${gatewayAmountToInternal(receivedAmountAfterTax)}`,
          })
          .where(eq(userWallet.user_id, user.id))
          .returning();
        if (!updatedUserWallet) throw new Error("User wallet not found");

        const [userWalletCredit] = await tx
          .insert(userCreditGrants)
          .values({
            user_id: user.id,
            balance: gatewayAmountToInternal(receivedAmountAfterTax),
            total_balance: gatewayAmountToInternal(receivedAmountAfterTax),
            wallet_id: updatedUserWallet.id,
            description,
            expires_at: expiresAt,
          })
          .returning();

        if (!userWalletCredit) throw new Error("Wallet credit was not created");
        await tx.insert(userWalletTransactions).values({
          transaction_type: "deposit",
          wallet_id: updatedUserWallet.id,
          description,
          raw_description: rawDescription,
          amount: gatewayAmountToInternal(receivedAmountAfterTax),
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
