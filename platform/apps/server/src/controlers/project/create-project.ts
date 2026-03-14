import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import { db, projects } from "@repo/db";
import { projectConfigValidator } from "@repo/shared";

export const createProject = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError("authentication is required", 401);
  }
  const { body } = req;

  const parsedData = projectConfigValidator.parse(body);
  const project = await db.transaction(async (tx) => {
    return await tx
      .insert(projects)
      .values({
        name: parsedData.name,
        description: parsedData.description,
        status: "terminated",
        user_id: user.id,
        instance_type_id: parsedData.instanceTypeId,
        total_charges: 0,
        config: parsedData.config,
      })
      .returning();
  });

  res.status(200).json({
    message: "Project created successfully",
    data: project,
  });
});
