import { and, db, eq, projectFileData, projectFiles, projects } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";

export const getProjectFiles = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);
    const { id } = z.object({ id: z.string() }).parse(req.params);

    const rows = await db
      .select({ projectFiles })
      .from(projectFiles)
      .innerJoin(projects, eq(projectFiles.project_id, projects.id))
      .where(and(eq(projects.user_id, user.id), eq(projects.id, id)));

    res.status(200).json({
      data: rows,
    });
  },
);

export const createProjectFile = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);
    const { id } = z.object({ id: z.string() }).parse(req.params);

    const { path, name, content } = z
      .object({
        path: z.string(),
        name: z.string(),
        content: z.string(),
      })
      .parse(req.body);

    await db.transaction(async (tx) => {
      const [project] = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.user_id, user.id)));

      if (!project) {
        throw new AppError("Project not found or unauthorized", 403);
      }

      const [projectfile] = await tx
        .insert(projectFiles)
        .values({
          path,
          name,
          project_id: id,
        })
        .returning();

      if (!projectfile) throw new AppError("project file not created", 400);

      await tx.insert(projectFileData).values({
        project_file_id: projectfile.id,
        content: content,
        version: 1,
      });
    });

    res.status(201).json({
      message: "project file created successfully",
    });
  },
);
