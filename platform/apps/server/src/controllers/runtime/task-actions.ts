import {
  and,
  db,
  eq,
  projectSessions,
  projectSessionTaskAgents,
  projectSessionTasks,
} from "@repo/db";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";

export const runTaskActions = catchAsync(
  async (req: Request, res: Response) => {
    const { id, taskId } = z
      .object({
        id: z.string(),
        taskId: z.string(),
      })
      .parse(req.params);

    const { done } = z
      .object({
        done: z.boolean(),
      })
      .parse(req.body);

    const [sessionWithTask] = await db
      .select()
      .from(projectSessions)
      .leftJoin(
        projectSessionTasks,
        and(
          eq(projectSessionTasks.project_session_id, id),
          eq(projectSessionTasks.id, taskId),
        ),
      )
      .where(eq(projectSessions.id, id));

    if (
      !sessionWithTask ||
      !sessionWithTask.project_session ||
      !sessionWithTask.project_session_tasks
    )
      throw new Error("Session not found");

    await db
      .update(projectSessionTasks)
      .set({
        done,
      })
      .where(
        eq(projectSessionTasks.id, sessionWithTask.project_session_tasks.id),
      );

    res.status(200).json({
      message: "Task is updated",
    });
  },
);
