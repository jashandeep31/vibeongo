import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import { db, projects, projectSshKeys } from "@repo/db";
import { projectConfigValidator } from "@repo/shared";

export const createProject = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError("authentication is required", 401);
  }
  const { body } = req;

  const parsedData = projectConfigValidator.parse(body);

  const project = await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        name: parsedData.name,
        description: parsedData.description,
        user_id: user.id,
        instance_type_id: parsedData.instanceTypeId,
        total_charges: 0,
        config: parsedData.config,
      })
      .returning();
    if (!project) throw new AppError("project not created", 400);

    for (const sshKeyId of parsedData.sshKeyIds) {
      await tx.insert(projectSshKeys).values({
        project_id: project.id,
        ssh_key_id: sshKeyId,
      });
    }

    return project;
  });

  res.status(200).json({
    message: "Project created successfully",
    data: project,
  });
});
