import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import { db } from "@repo/db";
import { projectConfigValidator, z } from "@repo/shared";

const createProjectSchema = z.object({
  name: z.string().min(3).max(3),
  instanceSlug: z.string(),
  config: projectConfigValidator,
});

export const createProject = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError("authentication is required", 401);
  }

  const project = await db.transaction(async (tx) => {
    // create the project with the stoped state
    // just save the config
    const { body } = req;
    const parsedData = createProjectSchema.parse(body);

    const config = parsedData.config;
  });
});
