import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import { db, projects } from "@repo/db";
import { projectConfigValidator, z } from "@repo/shared";

const createProjectSchema = z.object({
  name: z.string().min(1),
  instanceTypeId: z.string(),
  config: z.json(),
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
    await db.transaction(async (tx) => {
      await db.insert(projects).values({
        name: parsedData.name,
        description: "",
        status: "running",
        total_charges: 0,
        config: parsedData.config,
        user_id: user.id,
        instance_type_id: parsedData.instanceTypeId,
      });
      // TODO: create the project files
    });

    const config = parsedData.config;
  });
});
