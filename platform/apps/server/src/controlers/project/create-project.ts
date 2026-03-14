import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import { db, projects } from "@repo/db";
import { projectConfigValidator, z } from "@repo/shared";

export const createProject = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError("authentication is required", 401);
  }
  console.log(req.body);

  const project = await db.transaction(async (tx) => {
    // create the project with the stoped state
    // just save the config
    const { body } = req;
    const parsedData = projectConfigValidator.parse(body);
    // const config = parsedData.config;
  });

  res.status(200).json({
    message: "Project created successfully",
  });
});
