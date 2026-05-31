import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import {
  customQuery,
  db,
  desc,
  eq,
  userWallet,
  userWalletTransactions,
} from "@repo/db";
import { commonFilterSchema } from "@repo/shared";
import { z } from "zod";

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
