import { and, db, eq, instances, projects } from "@repo/db";
import { AppError } from "../../lib/appError.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";

export const getProjects = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("authentication is required", 401);

  //TODO: add pagination
  const dbProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.user_id, user.id));

  res.status(200).json({
    message: "Projects retrieved successfully",
    data: dbProjects,
  });
});

export const getProjectById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);

    const { id } = req.params;
    if (!id || typeof id !== "string")
      throw new AppError("project id is required", 400);

    const projectRows = await db
      .select({
        project: projects,
        instances: instances,
      })
      .from(projects)
      .leftJoin(instances, eq(instances.project_id, id))
      .where(and(eq(projects.user_id, user.id), eq(projects.id, id)));

    if (projectRows.length === 0) {
      throw new AppError("project not found", 404);
    }

    const project = projectRows[0]?.project;
    const projectInstances = projectRows
      .map((row) => row.instances)
      .filter((instance): instance is NonNullable<typeof instance> =>
        Boolean(instance?.id),
      );

    res.status(200).json({
      data: {
        project,
        instances: projectInstances,
      },
    });
  },
);
