import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import { db, eq, userWallet } from "@repo/db";
import { env } from "../../lib/env.js";
import { getCachedForgejoUsername } from "../../cache/forgejo-username-cache.js";

export const getUserMetadata = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);

    // Getting user wallet
    const [userWalletRow] = await db
      .select()
      .from(userWallet)
      .where(eq(userWallet.user_id, user.id));
    if (!userWalletRow) throw new AppError("Wallet not found", 404);

    const forgejoUsername =
      user.forgejo_id === null
        ? null
        : await getCachedForgejoUsername(user.forgejo_id);

    res.status(200).json({
      data: {
        id: user.id,
        tier: user.tier,
        balance: userWalletRow.balance,
        username: user.username,
        forgejo_username: forgejoUsername,
        forgejo_profile_link: forgejoUsername
          ? `${env.FORGEJO_URL}/${forgejoUsername}`
          : null,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    });
  },
);
