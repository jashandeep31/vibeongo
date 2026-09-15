import { Request, Response } from "express";
import { and, db, eq, gitRepos, projectFileData, projectFiles } from "@repo/db";
import { projectConfigValidator, z } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { encryptData } from "../../lib/encryption-decryption.js";
import { createProjectWithConfigAndUserIdService } from "../../services/project/create-project-service.js";
import {
  generateRepoFromForgejoTemplate,
  getForgejoRepo,
} from "../../services/forgejo/repo-actions.js";
import { FORGEJO_ACCOUNT_REQUIRED_MESSAGE } from "../../utils/defined-error-message.js";
import {
  projectTemplates,
  type ProjectTemplate,
} from "../../utils/templates/index.js";
import { getCachedForgejoUsername } from "../../cache/forgejo-username-cache.js";

export const getProjectTemplates = (_req: Request, res: Response) => {
  const templates = Object.entries(projectTemplates).map(
    ([id, createTemplate]) => {
      const template = createTemplate(id);
      return {
        id,
        name: template.project.name,
        description: template.project.description,
        config: resolveTemplateProjectConfig(template),
      };
    },
  );

  res.status(200).json({ data: templates });
};

export const createProjectFromTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);
    if (user.forgejo_id === null)
      throw new AppError(FORGEJO_ACCOUNT_REQUIRED_MESSAGE, 409);

    const forgejoUsername = await getCachedForgejoUsername(user.forgejo_id);

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

    const repoName = slugifyRepoName(projectName);
    let template = createTemplate(repoName);

    const createdRepo = await createUserForgejoRepoForProject({
      username: forgejoUsername,
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
        repo_owner_username: forgejoUsername,
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
        config: resolveTemplateProjectConfig(template),
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
          const [projectFile] = await tx
            .insert(projectFiles)
            .values({
              project_id: project.id,
              name: file.name,
              path: file.path,
            })
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

const resolveTemplateProjectConfig = (template: ProjectTemplate) => {
  const config = projectConfigValidator.shape.config.parse(
    template.project.config,
  );
  if (!template.dockerContainers) return config;

  return {
    ...config,
    packages: config.packages.map((projectPackage) =>
      projectPackage.name === "docker"
        ? {
            ...projectPackage,
            config: {
              ...projectPackage.config,
              containers: template.dockerContainers ?? [],
            },
          }
        : projectPackage,
    ),
  };
};

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
  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const newRepoName = suffix === 1 ? repoName : `${repoName}-${suffix}`;
    const existingRepo = await getForgejoRepo({
      username,
      reponame: newRepoName,
    });
    if (existingRepo) continue;

    const generatedRepo = await generateRepoFromForgejoTemplate({
      templateOwner: sourceRepoOwnerName,
      templateRepo: sourceRepoName,
      generateFor: username,
      newRepoName,
    });

    if (generatedRepo.status === "ok") {
      return {
        name: generatedRepo.repo.name,
        fullName: generatedRepo.repo.full_name,
      };
    }

    // Another request may claim this name between the existence check and
    // repository generation. Try the next deterministic suffix on conflict.
    if (generatedRepo.statusCode === 409) continue;

    throw new AppError(
      `Failed to create repository from template: ${generatedRepo.error}`,
      500,
    );
  }

  throw new AppError(
    "Failed to create repository: too many repositories use this project name",
    409,
  );
};
