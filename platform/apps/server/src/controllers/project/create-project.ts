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
} from "@repo/db";
import { projectConfigValidator } from "@repo/shared";

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
        config: parsedData.config,
      })
      .returning();
    if (!projectRow) throw new AppError("project not created", 400);

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

    return projectRow;
  });

  res.status(200).json({
    message: "Project created successfully",
    data: databaseRow,
  });
});
