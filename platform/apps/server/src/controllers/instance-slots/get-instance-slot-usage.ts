import { and, db, eq, inArray, instanceSlots, sql } from "@repo/db";
import { Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { tierLimits } from "../../utils/constants.js";

export const getInstanceSlotUsage = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const rows = await db
      .select({
        category: instanceSlots.category,
        used: sql<number>`count(*)::int`,
      })
      .from(instanceSlots)
      .where(
        and(
          eq(instanceSlots.user_id, user.id),
          inArray(instanceSlots.status, ["active", "provisioning"]),
        ),
      )
      .groupBy(instanceSlots.category);

    const usage = { manual: 0, auto: 0 };
    for (const row of rows) usage[row.category] = row.used;

    res.status(200).json({
      data: {
        tier: user.tier,
        manual: {
          used: usage.manual,
          limit: tierLimits[user.tier].manual,
        },
        auto: {
          used: usage.auto,
          limit: tierLimits[user.tier].auto,
        },
      },
    });
  },
);
