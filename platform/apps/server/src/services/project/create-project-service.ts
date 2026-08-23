import {
  inArray,
  and,
  eq,
  projects,
  sshKeys,
  gitRepos,
  db,
  projectDomainRouting,
  projectSshKeys,
  projectGitRepos,
  projectConfig,
  projectSessions,
} from "@repo/db";
import { projectConfigValidator } from "@repo/shared";
import { createDomainsForProject } from "../../lib/create-domain-for-project.js";
import { AppError } from "../../lib/app-error.js";
import { encryptData } from "../../lib/encryption-decryption.js";
import { normalizeProjectConfigForStorage } from "./normalize-project-config-for-storage.js";

export const createProjectWithConfigAndUserIdService = async (
  rawData: unknown,
  userId: string,
) => {
  const parsedData = projectConfigValidator.parse(rawData);

  const validRepos = await db
    .select()
    .from(gitRepos)
    .where(
      and(
        eq(gitRepos.user_id, userId),
        inArray(gitRepos.id, parsedData.githubRepoIds),
      ),
    );

  const validSshKeys = await db
    .select()
    .from(sshKeys)
    .where(
      and(
        eq(sshKeys.user_id, userId),
        inArray(sshKeys.id, parsedData.sshKeyIds),
      ),
    );

  const databaseRow = await db.transaction(async (tx) => {
    const [projectRow] = await tx
      .insert(projects)
      .values({
        name: parsedData.name,
        description: parsedData.description,
        user_id: userId,
        instance_type_id: parsedData.instanceTypeId,
        sandbox_type_id: parsedData.sandboxTypeId,
        total_charges: 0,
        initial_script: parsedData.initialScript,
        final_script: parsedData.finalScript,
        dev_script: parsedData.devScript,
      })
      .returning();
    if (!projectRow) throw new AppError("project not created", 400);

    await tx.insert(projectSessions).values({
      name: "default",
      description: "",
      user_id: userId,
      project_id: projectRow.id,
      category: "manual",
    });

    const configForStorage = normalizeProjectConfigForStorage(
      parsedData.config,
    );
    const enc = encryptData(JSON.stringify(configForStorage));
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
      await tx.insert(projectGitRepos).values(githubRepoData);

    if (sshKeyData.length) await tx.insert(projectSshKeys).values(sshKeyData);
    const [projectRouting] = await tx
      .insert(projectDomainRouting)
      .values({
        project_id: projectRow.id,
        user_id: userId,
      })
      .returning();
    if (!projectRouting) throw new AppError("project routing not created", 400);

    await createDomainsForProject({
      tx: tx,
      routingId: projectRouting.id,
      ports: [8080, 3000, 4096, 8000, 80, 5000, 3773, 3101],
      userId: userId,
    });

    return projectRow;
  });

  return databaseRow;
};
