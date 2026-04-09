import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import { and, db, eq, instances, projectSessions } from "@repo/db";

export const getUserProjectSesssion = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);

    const sessions = await db
      .select()
      .from(projectSessions)
      .leftJoin(
        instances,
        and(
          eq(instances.project_session_id, projectSessions.id),
          eq(instances.state, "running"),
        ),
      )
      .where(eq(projectSessions.user_id, user.id));

    res.status(200).json({ data: sessions });
  },
);
