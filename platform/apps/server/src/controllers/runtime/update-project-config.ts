import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { z } from "zod";
import { projectConfigValidator } from "@repo/shared";
import {
  db,
  eq,
  projectConfig,
  projects,
  projectSessions,
} from "@repo/db";
import { encryptData } from "../../lib/encryption-decryption.js";
import { AppError } from "../../lib/app-error.js";
import { getDecryptedProjectConfig } from "../../services/project/project-config.js";

export const updateRuntimeProjectBasicConfig = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);

    const basicConfigSchema = z.object({
      initialScript: projectConfigValidator.shape.initialScript,
      finalScript: projectConfigValidator.shape.finalScript,
      devScript: projectConfigValidator.shape.devScript,
      config: z.object({
        packages: projectConfigValidator.shape.config.shape.packages,
      }),
    });

    const parsedBody = basicConfigSchema.parse(req.body);

    const [session] = await db
      .select({ projectId: projectSessions.project_id })
      .from(projectSessions)
      .where(eq(projectSessions.id, id));

    if (!session) throw new AppError("Project session not found", 404);

    const storedConfig = projectConfigValidator.shape.config.parse(
      JSON.parse(await getDecryptedProjectConfig(session.projectId)),
    );
    const encryptedConfig = encryptData(
      JSON.stringify({
        ...storedConfig,
        packages: parsedBody.config.packages,
      }),
    );

    await db.transaction(async (tx) => {
      const [updatedProject] = await tx
        .update(projects)
        .set({
          initial_script: parsedBody.initialScript,
          final_script: parsedBody.finalScript,
          dev_script: parsedBody.devScript,
          updated_at: new Date(),
        })
        .where(eq(projects.id, session.projectId))
        .returning({ id: projects.id });

      if (!updatedProject) throw new AppError("Project not found", 404);

      const [updatedConfig] = await tx
        .update(projectConfig)
        .set({
          iv: encryptedConfig.iv,
          tag: encryptedConfig.tag,
          encrypted_config: encryptedConfig.encryptedData,
          updated_at: new Date(),
        })
        .where(eq(projectConfig.project_id, session.projectId))
        .returning({ id: projectConfig.id });

      if (!updatedConfig) throw new AppError("Project config not found", 404);
    });

    res.status(204).send();
  },
);
