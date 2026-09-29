import type { Request, Response } from "express";
import { db, eq, userWallet } from "@repo/db";
import { INTERNAL_MONEY_SCALE } from "@repo/shared";
import { createStreamingToken } from "../../ai/speech-text/assemble-ai.js";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";

const MIN_STREAMING_BALANCE = 0.1 * INTERNAL_MONEY_SCALE;

export const issueStreamingToken = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authorization is required", 401);

    const [wallet] = await db
      .select({ balance: userWallet.balance })
      .from(userWallet)
      .where(eq(userWallet.user_id, user.id));

    if (!wallet || wallet.balance < MIN_STREAMING_BALANCE) {
      throw new AppError(
        "Voice transcription requires a balance of at least $0.10.",
        402,
      );
    }

    let token: string;
    try {
      token = await createStreamingToken();
    } catch {
      throw new AppError(
        "Could not start voice transcription. Please try again.",
        502,
      );
    }

    res.status(200).json({ data: { token } });
  },
);
