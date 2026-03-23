import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import { and, db, eq, instances, projects } from "@repo/db";
import { z } from "zod";

const createInstanceBodySchema = z.object({
  projectId: z.string(),
});
export const createInstance = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);
    const body = createInstanceBodySchema.parse(req.body);

    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.user_id, user.id), eq(projects.id, body.projectId)),
      );

    if (!project) throw new AppError("Project not found", 404);
    // TODO: create the aws instance first them move on
    //
    if (1 == 1) return;
    await db.insert(instances).values({
      project_id: project.id,
      instance_type: project.instance_type_id,
      aws_instance_id: "",
      terminated_at: null,
      started_at: new Date(),
      state: "running",
    });
    res.status(201).json({
      message: "Successfully had created the project intance",
    });
  },
);
