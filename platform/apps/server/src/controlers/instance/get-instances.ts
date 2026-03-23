import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import { db, eq, instances } from "@repo/db";

export const getUserIntances = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 400);

    const rows = await db
      .select()
      .from(instances)
      .where(eq(instances.user_id, user.id));

    res.status(200).json({
      data: rows,
    });
  },
);
