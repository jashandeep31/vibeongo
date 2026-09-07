import { Request, Response } from "express";
import { and, db, eq, gitRepos, projectFileData, projectFiles } from "@repo/db";
import { projectConfigValidator, z } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { encryptData } from "../../lib/encryption-decryption.js";
import { createProjectWithConfigAndUserIdService } from "../../services/project/create-project-service.js";
import {
  forkRepoToForgejo,
  getForgejoRepo,
} from "../../services/forgejo/repo-actions.js";
import { ensureForgejoUserAccount } from "../../services/forgejo/user-actions.js";
import { projectTemplates } from "../../utils/templates/index.js";
import {
  adjectives,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";

export const getProjectTemplates = (_req: Request, res: Response) => {
  const templates = Object.entries(projectTemplates).map(
    ([id, createTemplate]) => {
      const template = createTemplate(id);
      return {
        id,
        name: template.project.name,
        description: template.project.description,
        config: template.project.config,
      };
    },
  );

  res.status(200).json({ data: templates });
};

export const createProjectFromTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const { templateId, projectName, regionId, instanceTypeId, sandboxTypeId } =
      z
        .object({
          templateId: z.string().trim().min(1),
          projectName: projectConfigValidator.shape.name,
          regionId: z.uuid("Select a deployment region"),
          instanceTypeId: z.uuid("Select an instance type"),
          sandboxTypeId: z.uuid("Select a sandbox type"),
        })
        .parse(req.body);

    const createTemplate = projectTemplates[templateId];
    if (!createTemplate) throw new AppError("Template not found", 404);

    await ensureForgejoUserAccount(user);
    const repoName = slugifyRepoName(projectName);
    let template = createTemplate(repoName);

    const createdRepo = await createUserForgejoRepoForProject({
      username: user.username,
      repoName,
      sourceRepoName: template.reponame,
      sourceRepoOwnerName: template.ownername,
    });
    template = createTemplate(createdRepo.name);

    const findRepo = async () => {
      const [repo] = await db
        .select({ id: gitRepos.id })
        .from(gitRepos)
        .where(
          and(
            eq(gitRepos.user_id, user.id),
            eq(gitRepos.full_name, createdRepo.fullName),
          ),
        )
        .limit(1);
      return repo;
    };

    const [insertedRepo] = await db
      .insert(gitRepos)
      .values({
        user_id: user.id,
        type: "forgejo",
        installation_id: 0,
        full_name: createdRepo.fullName,
        repo_owner_username: user.username,
        public: true,
        setup_script: "",
      })
      .onConflictDoNothing()
      .returning({ id: gitRepos.id });

    const repo = insertedRepo ?? (await findRepo());
    if (!repo)
      throw new AppError("Failed to save the template repository", 500);

    const project = await createProjectWithConfigAndUserIdService(
      {
        ...template.project,
        name: projectName,
        provider: "aws",
        regionId,
        instanceTypeId,
        sandboxTypeId,
        githubRepoIds: [repo.id],
        sshKeyIds: [],
      },
      user.id,
    );

    if (template.envFiles.length > 0) {
      await db.transaction(async (tx) => {
        for (const file of template.envFiles) {
          const name = file.path.split("/").filter(Boolean).at(-1);
          if (!name)
            throw new AppError("Template contains an invalid file path", 500);

          const [projectFile] = await tx
            .insert(projectFiles)
            .values({ project_id: project.id, name, path: file.path })
            .returning({ id: projectFiles.id });
          if (!projectFile)
            throw new AppError("Failed to create a template file", 500);

          const encrypted = encryptData(file.content);
          await tx.insert(projectFileData).values({
            project_file_id: projectFile.id,
            encrypted_content: encrypted.encryptedData,
            iv: encrypted.iv,
            tag: encrypted.tag,
            version: 1,
          });
        }
      });
    }

    res.status(201).json({
      message: "Project created from template",
      data: project,
    });
  },
);

const slugifyRepoName = (projectName: string) => {
  const repoName = projectName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");

  if (!repoName) {
    throw new AppError(
      "Project name must contain characters that can be used in a repository name",
      400,
    );
  }

  return repoName;
};

const createUserForgejoRepoForProject = async ({
  username,
  repoName,
  sourceRepoName,
  sourceRepoOwnerName,
}: {
  username: string;
  repoName: string;
  sourceRepoOwnerName: string;
  sourceRepoName: string;
}) => {
  const existingRepo = await getForgejoRepo({ username, reponame: repoName });
  const newRepoName = existingRepo
    ? `${repoName}-${uniqueNamesGenerator({ dictionaries: [adjectives, colors] })}`
    : repoName;

  const forkedRepo = await forkRepoToForgejo({
    sourceRepoOwnername: sourceRepoOwnerName,
    sourceReponame: sourceRepoName,
    forkFor: username,
    newReponame: newRepoName,
  });

  if (forkedRepo.status !== "ok") {
    throw new AppError(`Failed to create repository: ${forkedRepo.error}`, 500);
  }

  return {
    name: forkedRepo.repo.name,
    fullName: forkedRepo.repo.full_name,
  };
};
