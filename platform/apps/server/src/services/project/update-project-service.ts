import {
  inArray,
  and,
  eq,
  projects,
  sshKeys,
  githubRepos,
  db,
  projectGithubRepos,
  projectConfig,
  projectSshKeys,
} from "@repo/db";
import { projectConfigValidator } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";
import { encryptData } from "../../lib/encryption-decryption.js";

import { z } from "zod";
export const udpateProjectConfigByProjectIdAndUserId = async (
  rawData: unknown,
  userId: string,
) => {
  const parsedData = projectConfigValidator
    .extend({ projectId: z.string() })
    .parse(rawData);

  const projectId = parsedData.projectId;

  const githubRepoIds = [...new Set(parsedData.githubRepoIds)];
  const sshKeyIds = [...new Set(parsedData.sshKeyIds)];

  const [projectRow] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.user_id, userId),
        eq(projects.id, projectId),
        eq(projects.deleted, false),
      ),
    );

  if (!projectRow) throw new AppError("project not found", 404);

  const validRepos = githubRepoIds.length
    ? await db
        .select({ id: githubRepos.id })
        .from(githubRepos)
        .where(
          and(
            eq(githubRepos.user_id, userId),
            inArray(githubRepos.id, githubRepoIds),
          ),
        )
    : [];

  if (validRepos.length !== githubRepoIds.length)
    throw new AppError("invalid github repository selected", 400);

  const validSshKeys = sshKeyIds.length
    ? await db
        .select({ id: sshKeys.id })
        .from(sshKeys)
        .where(and(eq(sshKeys.user_id, userId), inArray(sshKeys.id, sshKeyIds)))
    : [];

  if (validSshKeys.length !== sshKeyIds.length)
    throw new AppError("invalid ssh key selected", 400);

  const updatedProject = await db.transaction(async (tx) => {
    const [updatedProjectRow] = await tx
      .update(projects)
      .set({
        name: parsedData.name,
        description: parsedData.description,
        instance_type_id: parsedData.instanceTypeId,
        initial_script: parsedData.initialScript,
        final_script: parsedData.finalScript,
        dev_script: parsedData.devScript,
        updated_at: new Date(),
      })
      .where(and(eq(projects.user_id, userId), eq(projects.id, projectId)))
      .returning();

    if (!updatedProjectRow) throw new AppError("project not updated", 400);

    const enc = encryptData(JSON.stringify(parsedData.config));
    await tx
      .update(projectConfig)
      .set({
        iv: enc.iv,
        encrypted_config: enc.encryptedData,
        tag: enc.tag,
        updated_at: new Date(),
      })
      .where(eq(projectConfig.project_id, projectId));

    await tx
      .delete(projectGithubRepos)
      .where(eq(projectGithubRepos.project_id, projectId));
    await tx
      .delete(projectSshKeys)
      .where(eq(projectSshKeys.project_id, projectId));

    if (validRepos.length) {
      await tx.insert(projectGithubRepos).values(
        validRepos.map((repo) => ({
          project_id: projectId,
          github_repo_id: repo.id,
        })),
      );
    }

    if (validSshKeys.length) {
      await tx.insert(projectSshKeys).values(
        validSshKeys.map((sshKey) => ({
          project_id: projectId,
          ssh_key_id: sshKey.id,
        })),
      );
    }

    return updatedProjectRow;
  });
  return updatedProject;
};
