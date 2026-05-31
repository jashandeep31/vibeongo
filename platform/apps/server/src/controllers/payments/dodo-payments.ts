import DodoPayments from "dodopayments";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { env } from "../../lib/env.js";
import { AppError } from "../../lib/app-error.js";
import { z } from "zod";
import {
  db,
  eq,
  paymentGatewayTransactions,
  userWallet,
  desc,
  userWalletTransactions,
  customQuery,
} from "@repo/db";
import { commonFilterSchema } from "@repo/shared";

export const dodoPaymentClient = new DodoPayments({
  bearerToken: env.DODO_PAYMENT_BEARER_TOKEN,
  environment: env.NODE_ENV == "development" ? "test_mode" : "live_mode",
  webhookKey: env.DODO_PAYMENTS_WEBHOOK_SECRET,
});
export const getUserWallet = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authorization is required", 401);

  const filters = commonFilterSchema
    .extend({
      transactions: z
        .preprocess((value) => {
          if (Array.isArray(value)) return value.at(-1);
          if (typeof value === "string") return value.toLowerCase() === "true";
          return value;
        }, z.boolean())
        .default(false),
    })
    .parse(req.query);

  const [wallet] = await db
    .select()
    .from(userWallet)
    .where(eq(userWallet.user_id, user.id));

  if (!wallet || !filters.transactions) {
    res.status(200).json({
      data: {
        wallet,
        transactions: [],
      },
    });
    return;
  }

  const rows = await customQuery(
    db
      .select()
      .from(userWalletTransactions)
      .where(eq(userWalletTransactions.wallet_id, wallet.id))
      .orderBy(desc(userWalletTransactions.created_at))
      .$dynamic(),
    filters.page,
    filters.limit,
  );

  res.status(200).json({
    data: {
      wallet,
      transactions: rows.slice(0, filters.limit),
    },
    page: filters.page,
    hasNext: rows.length > filters.limit,
  });
});

export const getDodoPaymentCheckoutUrl = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 401);

    const { amount } = z
      .object({
        amount: z.number().min(500),
      })
      .parse(req.body);

    const checkoutSession = await dodoPaymentClient.checkoutSessions.create({
      customer: {
        email: user.email,
        name: user.first_name + " " + user.last_name,
      },
      product_cart: [
        { amount, quantity: 1, product_id: env.DODO_PAYMENT_PRODUCT_ID },
      ],
    });

    // amount is as per the dollar not as are real *4 one
    await db.insert(paymentGatewayTransactions).values({
      user_id: user.id,
      amount,
      sessionId: checkoutSession.session_id,
      status: "pending",
    });

    res.status(200).json({
      checkoutUrl: checkoutSession.checkout_url,
    });
  },
);
