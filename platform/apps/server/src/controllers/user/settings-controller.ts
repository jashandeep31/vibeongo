import { Request, Response } from "express";
import { db, eq, userSettings } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";

export const getUserSettings = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.user_id, user.id));

    if (!settings) {
      throw new AppError("user setting not found ", 404);
    }
    res.status(200).json({
      data: settings,
    });
  },
);
