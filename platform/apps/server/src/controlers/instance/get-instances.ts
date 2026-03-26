import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import { and, db, eq, instances } from "@repo/db";

export const getUserInstances = catchAsync(
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

export const getInstanceById = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string") throw new AppError("Id should be string ", 400);
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 400);

    const [row] = await db
      .select()
      .from(instances)
      .where(and(eq(instances.user_id, user.id), eq(instances.id, id)));

    if (!row) throw new AppError("instance not found", 404);

    res.status(200).json({
      data: row,
    });
  },
);

export const getInstancesByProjectId = catchAsync(
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    if (typeof projectId !== "string") {
      throw new AppError("projectId should be string", 400);
    }

    const user = req.user;
    if (!user) throw new AppError("authentication is required", 400);

    const rows = await db
      .select()
      .from(instances)
      .where(
        and(
          eq(instances.user_id, user.id),
          eq(instances.project_id, projectId),
        ),
      );

    res.status(200).json({
      data: rows,
    });
  },
);
