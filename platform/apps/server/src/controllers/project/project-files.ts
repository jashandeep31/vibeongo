import {
  and,
  db,
  eq,
  desc,
  projectFileData,
  projectFiles,
  projects,
  ConsoleLogWriter,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";
import { decryptData, encryptData } from "../../lib/encryption-decryption.js";

type RefinedFile = typeof projectFiles.$inferSelect & {
  projectFileData?: Pick<
    typeof projectFileData.$inferSelect,
    "id" | "version" | "created_at" | "updated_at"
  > & { content: string };
};

export const getProjectFiles = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);
    const { id } = z.object({ id: z.string() }).parse(req.params);

    const rows = await db
      .select({
        projectFiles,
        projectFileData,
      })
      .from(projectFiles)
      .innerJoin(projects, eq(projectFiles.project_id, projects.id))
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
      .where(and(eq(projects.user_id, user.id), eq(projects.id, id)));

    const refinedFiles: Map<string, RefinedFile> = new Map();

    for (const item of rows) {
      if (item.projectFiles) {
        if (!refinedFiles.has(item.projectFiles.id)) {
          refinedFiles.set(item.projectFiles.id, {
            ...item.projectFiles,
          });
        }
      }
      if (item.projectFileData) {
        const projectFile = item.projectFileData;
        const selectedItem = refinedFiles.get(
          item.projectFileData.project_file_id,
        );
        if (!selectedItem) continue;

        refinedFiles.set(selectedItem.id, {
          ...selectedItem,
          projectFileData: {
            id: projectFile.id,
            content: decryptData({
              encrypted: projectFile.encrypted_content,
              iv: projectFile.iv,
              tag: projectFile.tag,
            }),
            created_at: projectFile.created_at,
            updated_at: projectFile.updated_at,
            version: projectFile.version,
          },
        });
      }
    }

    res.status(200).json({
      data: [...refinedFiles.values()],
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

      const enc = encryptData(content);
      await tx.insert(projectFileData).values({
        project_file_id: projectfile.id,

        encrypted_content: enc.encryptedData,
        iv: enc.iv,
        tag: enc.tag,

        version: 1,
      });
    });

    res.status(201).json({
      message: "project file created successfully",
    });
  },
);

export const updateProjectFile = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);

    const { id, fileId } = z
      .object({ id: z.string(), fileId: z.string() })
      .parse(req.params);

    const { path, name, content } = z
      .object({
        path: z.string().optional(),
        name: z.string().optional(),
        content: z.string().optional(),
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

      if (path !== undefined || name !== undefined) {
        const updateData: any = {};
        if (path !== undefined) updateData.path = path;
        if (name !== undefined) updateData.name = name;

        await tx
          .update(projectFiles)
          .set(updateData)
          .where(
            and(eq(projectFiles.id, fileId), eq(projectFiles.project_id, id)),
          );
      }
      // const enc = encryptData()

      if (content !== undefined) {
        const [latestData] = await tx
          .select()
          .from(projectFileData)
          .where(eq(projectFileData.project_file_id, fileId))
          .orderBy(desc(projectFileData.version))
          .limit(1);

        let decryptedPrevContent = null;

        if (latestData) {
          decryptedPrevContent = decryptData({
            iv: latestData.iv,
            tag: latestData.tag,
            encrypted: latestData?.encrypted_content,
          });
        }

        if (decryptedPrevContent !== content) {
          const enc = encryptData(content);
          const newVersion = latestData ? latestData.version + 1 : 1;
          await tx.insert(projectFileData).values({
            project_file_id: fileId,
            version: newVersion,

            encrypted_content: enc.encryptedData,
            iv: enc.iv,
            tag: enc.tag,
          });
        }
      }
    });

    res.status(200).json({
      message: "project file updated successfully",
    });
  },
);
