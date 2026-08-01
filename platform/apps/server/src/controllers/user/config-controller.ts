import { Request, Response } from "express";
import { db, eq, userConfigs } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";

export const getUserConfigs = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const configs = await db
      .select({
        id: userConfigs.id,
        user_id: userConfigs.user_id,
        config_type: userConfigs.config_type,
        created_at: userConfigs.created_at,
        updated_at: userConfigs.updated_at,
      })
      .from(userConfigs)
      .where(eq(userConfigs.user_id, user.id));

    res.status(200).json({
      data: configs,
    });
  },
);
