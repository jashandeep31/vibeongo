import DodoPayments from "dodopayments";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { env } from "../../lib/env.js";
import { AppError } from "../../lib/app-error.js";
import { z } from "zod";
import { db, paymentGatewayTransactions } from "@repo/db";
import { PAYMENT_GATEWAY_SCALE } from "@repo/shared";

const MIN_CREDIT_AMOUNT_DOLLARS = 5;
const MAX_CREDIT_AMOUNT_DOLLARS = 300;

export const dodoPaymentClient = new DodoPayments({
  bearerToken: env.DODO_PAYMENT_BEARER_TOKEN,
  environment: env.NODE_ENV == "development" ? "test_mode" : "live_mode",
  webhookKey: env.DODO_PAYMENTS_WEBHOOK_SECRET,
});

export const getDodoPaymentCheckoutUrl = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 401);

    const { amount: amountInDollars, client } = z
      .object({
        amount: z
          .number()
          .int()
          .min(MIN_CREDIT_AMOUNT_DOLLARS)
          .max(MAX_CREDIT_AMOUNT_DOLLARS),
        client: z.enum(["mobile-app", "web-app", "legacy"]).default("legacy"),
      })
      .parse(req.body);
    const amount = amountInDollars * PAYMENT_GATEWAY_SCALE;

    const returnUrl =
      client === "mobile-app"
        ? env.VIBEONGO_APP_DEEP_LINK + "/"
        : client === "web-app"
          ? env.NEXTJS_APP_URL + "/wallet"
          : env.FRONTEND_URL + "/dashboard/wallet";

    const checkoutSession = await dodoPaymentClient.checkoutSessions.create({
      customer: {
        email: user.email,
        name: user.first_name + " " + user.last_name,
      },
      return_url: returnUrl,
      product_cart: [
        { amount, quantity: 1, product_id: env.DODO_PAYMENT_PRODUCT_ID },
      ],
    });

    // Gateway transactions remain in the currency's smallest unit (cents for USD).
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
