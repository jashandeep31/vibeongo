import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import { createProjectWithConfigAndUserIdService } from "../../services/project/create-project-service.js";

export const createProject = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError("authentication is required", 401);
  }

  const { body } = req;
  const createdProject = await createProjectWithConfigAndUserIdService(
    body,
    user.id,
  );

  res.status(200).json({
    message: "Project created successfully",
    data: createdProject,
  });
});
