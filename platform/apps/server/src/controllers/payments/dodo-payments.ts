import DodoPayments from "dodopayments";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { env } from "../../lib/env.js";
import { AppError } from "../../lib/app-error.js";
import { z } from "zod";

const dodoPaymentClient = new DodoPayments({
  bearerToken: env.DODO_PAYMENT_BEARER_TOKEN,
  environment: env.NODE_ENV == "development" ? "test_mode" : "live_mode",
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
      product_cart: [
        { amount, quantity: 1, product_id: env.DODO_PAYMENT_PRODUCT_ID },
      ],
    });

    res.status(200).json({
      checkoutUrl: checkoutSession.checkout_url,
    });
  },
);
