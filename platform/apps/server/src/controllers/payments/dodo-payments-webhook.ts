import {
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
import { paginateGetTransitGatewayAttachmentPropagations } from "@aws-sdk/client-ec2";

export const dodoPaymentsWebhook = async (req: Request, res: Response) => {
  try {
    const rawBody = req.body.toString("utf8");
    const unwrapped = dodoPaymentClient.webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": req.headers["webhook-id"] as string,
        "webhook-signature": req.headers["webhook-signature"] as string,
        "webhook-timestamp": req.headers["webhook-timestamp"] as string,
      },
    });

    if (unwrapped.type === "payment.succeeded") {
      // thigns we have to do
      // update the wallet balance
      //  create a tranction to the awllet
      //
      if (!unwrapped.data.checkout_session_id) {
        res.status(200).json({ recieved: true });
        return;
      }

      const [paymentAndUserDbRow] = await db
        .select()
        .from(paymentGatewayTransactions)
        .leftJoin(users, eq(users.id, paymentGatewayTransactions.user_id))
        .where(
          eq(
            paymentGatewayTransactions.sessionId,
            unwrapped.data.checkout_session_id!,
          ),
        );

      if (!paymentAndUserDbRow || !paymentAndUserDbRow.users) {
        res.status(200).json({ received: true });
        return;
      }
      const {
        users: user,
        payment_gateway_transactions: _paymentGatewayTransaction,
      } = paymentAndUserDbRow;

      const { settlement_amount, settlement_currency, settlement_tax } =
        unwrapped.data;

      if (!settlement_amount || !settlement_currency || !settlement_tax) {
        res.status(200).json({ recieved: true });
        return;
      }
      const received_amount_after_tax = settlement_amount - settlement_tax;
      const expires_at = new Date();
      expires_at.setFullYear(expires_at.getFullYear() + 1);
      await db.transaction(async (tx) => {
        const [updatedUserWallet] = await tx
          .update(userWallet)
          .set({
            balance: sql`${userWallet.balance} + ${received_amount_after_tax}`,
          })
          .where(eq(userWallet.user_id, user.id))
          .returning();
        if (!updatedUserWallet) throw new Error();

        const [userWalletCredit] = await db
          .insert(userWalletCredits)
          .values({
            user_id: user.id,
            balance: received_amount_after_tax,
            total_balance: received_amount_after_tax,
            wallet_id: updatedUserWallet.id,
            description: "User topup",
            expires_at: expires_at,
          })
          .returning();

        if (!userWalletCredit) throw new Error();
        await tx.insert(userWalletTransactions).values({
          transaction_type: "deposit",
          wallet_id: updatedUserWallet.id,
          description: "User topup",
          amount: received_amount_after_tax,
          user_wallet_credit_id: userWalletCredit.id,
        });

        await tx.update(paymentGatewayTransactions).set({
          status: "success",
          amount: received_amount_after_tax,
          completed_at: new Date(),
          raw: JSON.stringify(unwrapped),
        });
      });
    }
    res.status(200).json({ received: true });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Invalid Dodo webhook" });
  }
};
