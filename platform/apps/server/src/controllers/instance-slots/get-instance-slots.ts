import {
  and,
  customQuery,
  db,
  desc,
  eq,
  instanceRuntimeKind,
  instanceSlotInstanceCategory,
  instanceSlots,
  instanceSlotStatus,
} from "@repo/db";
import { commonFilterSchema } from "@repo/shared";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";

const instanceSlotFiltersSchema = commonFilterSchema.extend({
  status: z.enum([...instanceSlotStatus.enumValues, "all"]).default("all"),
  category: z
    .enum([...instanceSlotInstanceCategory.enumValues, "all"])
    .default("all"),
  runtime: z.enum([...instanceRuntimeKind.enumValues, "all"]).default("all"),
  session_id: z.uuid().optional(),
});

export const getUserInstanceSlots = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const { page, limit, status, category, runtime, session_id } =
      instanceSlotFiltersSchema.parse(req.query);

    const rows = await customQuery(
      db
        .select()
        .from(instanceSlots)
        .where(
          and(
            eq(instanceSlots.user_id, user.id),
            status !== "all" ? eq(instanceSlots.status, status) : undefined,
            category !== "all"
              ? eq(instanceSlots.category, category)
              : undefined,
            runtime !== "all"
              ? eq(instanceSlots.runtime_kind, runtime)
              : undefined,
            session_id ? eq(instanceSlots.session_id, session_id) : undefined,
          ),
        )
        .orderBy(desc(instanceSlots.created_at))
        .$dynamic(),
      page,
      limit,
    );

    res.status(200).json({
      data: rows.slice(0, limit),
      page,
      hasNext: rows.length > limit,
    });
  },
);
