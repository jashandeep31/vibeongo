import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import {
  db,
  githubRepos,
  projectGithubRepos,
  projects,
  projectSshKeys,
  and,
  eq,
  inArray,
  sshKeys,
  projectDomainRouting,
  projectConfig,
} from "@repo/db";
import { projectConfigValidator } from "@repo/shared";
import { createDomainsForProject } from "../../lib/create-domain-for-project.js";
import { encryptData } from "../../lib/encryption-decryption.js";

export const createProject = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError("authentication is required", 401);
  }

  const { body } = req;
  const parsedData = projectConfigValidator.parse(body);

  const validRepos = await db
    .select()
    .from(githubRepos)
    .where(
      and(
        eq(githubRepos.user_id, user.id),
        inArray(githubRepos.id, parsedData.githubRepoIds),
      ),
    );

  const validSshKeys = await db
    .select()
    .from(sshKeys)
    .where(
      and(
        eq(sshKeys.user_id, user.id),
        inArray(sshKeys.id, parsedData.sshKeyIds),
      ),
    );
  const databaseRow = await db.transaction(async (tx) => {
    const [projectRow] = await tx
      .insert(projects)
      .values({
        name: parsedData.name,
        description: parsedData.description,
        user_id: user.id,
        instance_type_id: parsedData.instanceTypeId,
        total_charges: 0,
        initial_script: parsedData.initial_script,
        final_script: parsedData.final_script,
      })
      .returning();
    if (!projectRow) throw new AppError("project not created", 400);

    const enc = encryptData(JSON.stringify(parsedData.config));
    await tx.insert(projectConfig).values({
      project_id: projectRow.id,
      encrypted_config: enc.encryptedData,
      tag: enc.tag,
      iv: enc.iv,
    });

    const githubRepoData: { project_id: string; github_repo_id: string }[] =
      validRepos.map((item) => {
        return {
          project_id: projectRow.id,
          github_repo_id: item.id,
        };
      });

    const sshKeyData: { project_id: string; ssh_key_id: string }[] =
      validSshKeys.map((item) => {
        return {
          project_id: projectRow.id,
          ssh_key_id: item.id,
        };
      });

    // --- Linking the repective github repos and ssh keys to the project ---
    if (githubRepoData.length)
      await tx.insert(projectGithubRepos).values(githubRepoData);

    if (sshKeyData.length) await tx.insert(projectSshKeys).values(sshKeyData);
    const [projectRouting] = await tx
      .insert(projectDomainRouting)
      .values({
        project_id: projectRow.id,
        user_id: user.id,
      })
      .returning();
    if (!projectRouting) throw new AppError("project routing not created", 400);

    await createDomainsForProject({
      tx: tx,
      routingId: projectRouting.id,
      ports: [8080, 3000, 4096, 8000, 80],
      userId: user.id,
    });

    return projectRow;
  });
  // adding some default domaing

  res.status(200).json({
    message: "Project created successfully",
    data: databaseRow,
  });
});
