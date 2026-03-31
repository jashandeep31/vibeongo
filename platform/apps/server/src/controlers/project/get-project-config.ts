import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import { and, db, eq, projects } from "@repo/db";

export const getProjectConfigById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 400);

    const id = req.params.id;
    if (!id || typeof id !== "string") throw new AppError("Invalid id ", 400);

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.user_id, user.id)));
    if (!project) throw new AppError("Project not found", 404);

    res.status(200).json({ data: project.config });
  },
);
