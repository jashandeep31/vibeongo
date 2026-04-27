import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";

import { z } from "zod";
import {
  and,
  db,
  eq,
  desc,
  projectFileData,
  projectFiles,
  projects,
  projectSessions,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";

type ProjectFileItem = typeof projectFiles.$inferSelect & {
  project_file_data: typeof projectFileData.$inferSelect | null;
};

export const getRuntimeProjectFiles = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = await z.object({ id: z.string() }).parseAsync(req.params);

    const rows = await db
      .select({ projectFiles, projectFileData })
      .from(projectFiles)
      .innerJoin(projectSessions, eq(projectSessions.id, id))
      .innerJoin(projects, eq(projects.id, projectSessions.project_id))
      .leftJoin(
        projectFileData,
        and(
          eq(projectFileData.project_file_id, projectFiles.id),

          eq(
            projectFileData.id,
            db
              .select({ id: projectFileData.id })
              .from(projectFileData)
              .where(eq(projectFileData.project_file_id, projectFiles.id))
              .orderBy(desc(projectFileData.version))
              .limit(1),
          ),
        ),
      )
      .where(and(eq(projectFiles.project_id, projects.id)));

    if (!rows) throw new AppError("Project not found", 404);

    const projectFilesMap = new Map<string, ProjectFileItem>();
    for (const item of rows) {
      if (item.projectFiles) {
        if (projectFilesMap.get(item.projectFiles.id)) continue;
        projectFilesMap.set(item.projectFiles.id, {
          ...item.projectFiles,
          project_file_data: null,
        });
      }
      if (item.projectFileData) {
        const projectItem = projectFilesMap.get(
          item.projectFileData.project_file_id,
        );
        if (!projectItem) continue;
        projectItem.project_file_data = item.projectFileData;
      }
    }

    res.json({
      data: Array.from(projectFilesMap.values()),
    });
  },
);
