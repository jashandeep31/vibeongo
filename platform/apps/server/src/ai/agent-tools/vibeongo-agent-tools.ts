import {
  db,
  gitRepos,
  eq,
  and,
  instanceRuntimeKind,
  instanceRegions,
  instanceTypes,
  projectFileData,
  projectFiles,
  projectGitRepos,
  projects,
  sandboxRegions,
  sandboxTypes,
  sshKeys,
  asc,
  desc,
  userConfigs,
  users,
} from "@repo/db";
import { z } from "zod";
import { Tool, tool } from "ai";
import { createInstanceSchema, projectConfigValidator } from "@repo/shared";
import { getRepoAccessDetails } from "../../github-app-functions/get-repo-access-details.js";
import { AppError } from "../../lib/app-error.js";
import { decryptData, encryptData } from "../../lib/encryption-decryption.js";
import { env } from "../../lib/env.js";
import { createProjectWithConfigAndUserIdService } from "../../services/project/create-project-service.js";
import { createProjectSessionInstance } from "../../services/instances/create-project-session-instance.js";
import { getDecryptedProjectConfig } from "../../services/project/project-config.js";
import { parseStoredProjectConfig } from "../../services/project/parse-stored-project-config.js";
import { udpateProjectConfigByProjectIdAndUserId } from "../../services/project/update-project-service.js";
import { createForgejoRepo } from "../../services/forgejo/repo-actions.js";
import { getGitRepoHtmlUrl } from "../../services/github/git-repo-url.js";

export const getUserReposListAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Lists all repositories connected to the current user's account, including GitHub and Forgejo repositories. Each result includes its provider-aware html_url and all saved repository fields except creation and update timestamps.",
    inputSchema: z.object({}),
    execute: async () => {
      const repos = await db
        .select()
        .from(gitRepos)
        .where(eq(gitRepos.user_id, userId));

      const res = repos.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        type: r.type,
        default_project_id: r.default_project_id,
        installation_id: r.installation_id,
        auto_review_pull_requests_enabled: r.auto_review_pull_requests_enabled,
        auto_fix_issues_enabled: r.auto_fix_issues_enabled,
        overview: r.overview,
        public: r.public,
        full_name: r.full_name,
        html_url: getGitRepoHtmlUrl(r),
        repo_owner_username: r.repo_owner_username,
        setup_script: r.setup_script,
      }));

      return res;
    },
  });

export const getUserSshKeysAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Lists the current user's configured SSH keys, including each key's ID, name, and public-key value. Use this to identify an existing key before selecting it for an operation.",
    inputSchema: z.object({}),
    execute: async () => {
      const keys = await db
        .select({
          id: sshKeys.id,
          name: sshKeys.name,
          value: sshKeys.value,
        })
        .from(sshKeys)
        .where(eq(sshKeys.user_id, userId))
        .orderBy(asc(sshKeys.name));

      return keys;
    },
  });

export const getUserConfigsAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Lists the current user's saved configuration types for OpenCode, Codex, and Pi. It returns only configuration-type metadata, never decrypted credentials. Users must manage or edit configurations in Settings.",
    inputSchema: z.object({}),
    execute: async () => {
      const configs = await db
        .select({ config_type: userConfigs.config_type })
        .from(userConfigs)
        .where(eq(userConfigs.user_id, userId));

      return configs.map((config) => config.config_type);
    },
  });

export const getInstanceCatalogAgentTool = (): Tool =>
  tool({
    description:
      "Lists the available VPS and sandbox deployment options. Use it before configuring a project to select valid provider, region, instance type, and sandbox type IDs. Results group instance types by VPS region and sandbox types by sandbox region, with hardware and pricing details.",
    inputSchema: z.object({}),
    execute: async () => {
      const [regions, types, availableSandboxRegions, availableSandboxTypes] =
        await Promise.all([
          db
            .select({
              id: instanceRegions.id,
              name: instanceRegions.name,
              slug: instanceRegions.slug,
              provider: instanceRegions.provider,
            })
            .from(instanceRegions)
            .orderBy(asc(instanceRegions.name)),
          db
            .select({
              id: instanceTypes.id,
              name: instanceTypes.name,
              slug: instanceTypes.slug,
              description: instanceTypes.description,
              cpu: instanceTypes.cpu,
              ram: instanceTypes.ram,
              provider: instanceTypes.provider,
              region_id: instanceTypes.region_id,
              price_per_hour: instanceTypes.price_per_hour,
            })
            .from(instanceTypes)
            .orderBy(asc(instanceTypes.name)),
          db
            .select({
              id: sandboxRegions.id,
              name: sandboxRegions.name,
              slug: sandboxRegions.slug,
              provider: sandboxRegions.provider,
            })
            .from(sandboxRegions)
            .orderBy(asc(sandboxRegions.name)),
          db
            .select({
              id: sandboxTypes.id,
              name: sandboxTypes.name,
              slug: sandboxTypes.slug,
              description: sandboxTypes.description,
              cpu: sandboxTypes.cpu,
              ram: sandboxTypes.ram,
              provider: sandboxTypes.provider,
              sandbox_region: sandboxTypes.sandbox_region,
              price_per_seconds: sandboxTypes.price_per_seconds,
            })
            .from(sandboxTypes)
            .orderBy(asc(sandboxTypes.name)),
        ]);

      return {
        instances: regions.map((region) => ({
          ...region,
          instanceTypes: types.filter((type) => type.region_id === region.id),
        })),
        sandboxes: availableSandboxRegions.map((region) => ({
          ...region,
          sandboxTypes: availableSandboxTypes.filter(
            (type) => type.sandbox_region === region.id,
          ),
        })),
      };
    },
  });

export const listProjectsAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Lists the current user's active projects by ID and name. Use this to find a project ID before reading, updating, or comparing a project.",
    inputSchema: z.object({}),
    execute: async () => {
      return db
        .select({ name: projects.name, id: projects.id })
        .from(projects)
        .where(and(eq(projects.user_id, userId), eq(projects.deleted, false)));
    },
  });

const getProjectConfigSchema = z.object({
  projectId: z.uuid().describe("ID of the project whose configuration to read"),
});

export const getProjectConfigAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Reads an active project's saved configuration and metadata. Use this when the user refers to an existing project or wants to inspect, compare, or reuse its configuration.",
    inputSchema: getProjectConfigSchema,
    toModelOutput: ({ output }) => ({
      type: "text",
      value: JSON.stringify(output),
    }),
    execute: async ({ projectId }: z.infer<typeof getProjectConfigSchema>) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.user_id, userId),
            eq(projects.id, projectId),
            eq(projects.deleted, false),
          ),
        );

      if (!project) {
        return { error: "Project not found or doesn't belong to you" };
      }

      try {
        const config = parseStoredProjectConfig(
          await getDecryptedProjectConfig(project.id),
        );
        return { project: { ...project, config } };
      } catch {
        return { error: "Project config is invalid" };
      }
    },
  });

const addGithubRepositorySchema = z.object({
  url: z
    .url()
    .describe("GitHub repository URL, such as https://github.com/owner/repo"),
  setup_script: z
    .string()
    .optional()
    .default(" ")
    .describe("Optional setup script to save for the repository"),
});

export const addGithubRepositoryAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Connects a GitHub repository to the current user's account after verifying GitHub App access. Use this only when the user wants to add a repository that is not already connected.",
    inputSchema: addGithubRepositorySchema,
    execute: async ({
      url,
      setup_script,
    }: z.infer<typeof addGithubRepositorySchema>) => {
      let owner = "";
      let repoName = "";
      try {
        const parsedUrl = new URL(url);
        const parts = parsedUrl.pathname.split("/").filter(Boolean);
        if (parts.length < 2 || !parts[0] || !parts[1]) {
          throw new Error("Invalid URL path");
        }
        owner = parts[0];
        repoName = parts[1].replace(".git", "");
      } catch {
        throw new AppError("Invalid GitHub repository URL", 400);
      }

      const result = await getRepoAccessDetails({ owner, repo: repoName });
      if (!result.hasAppAccess) {
        throw new AppError("App access is required", 400);
      }

      const [newRepo] = await db
        .insert(gitRepos)
        .values({
          user_id: userId,
          installation_id: result.installationId,
          full_name: result.repoData.full_name as string,
          repo_owner_username: result.repoData.owner.login as string,
          setup_script,
          public: result.isPublic,
        })
        .returning();

      return JSON.stringify(
        newRepo
          ? { ...newRepo, html_url: getGitRepoHtmlUrl(newRepo) }
          : newRepo,
      );
    },
  });

const createForgejoRepositorySchema = z.object({
  reponame: z
    .string()
    .trim()
    .min(1)
    .describe("Name of the public Forgejo repository to create"),
  description: z
    .string()
    .trim()
    .optional()
    .describe("Optional description for the Forgejo repository"),
});

export const createForgejoRepositoryAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Creates a public Forgejo repository for the current user and adds it to their connected repositories. Use this only after the user has explicitly asked to create the repository and confirmed its name.",
    inputSchema: createForgejoRepositorySchema,
    execute: async ({
      reponame,
      description,
    }: z.infer<typeof createForgejoRepositorySchema>) => {
      const [user] = await db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return { status: "error", error: "User not found" };
      }

      const result = await createForgejoRepo({
        username: user.username,
        reponame,
        ...(description !== undefined ? { description } : {}),
      });

      if (result.status === "error") {
        return result;
      }

      try {
        const [savedRepo] = await db
          .insert(gitRepos)
          .values({
            type: "forgejo",
            installation_id: result.repo.id,
            full_name: result.repo.full_name,
            repo_owner_username: user.username,
            setup_script: "",
            public: !result.repo.private,
            user_id: userId,
          })
          .returning();

        if (!savedRepo) {
          throw new Error("Repository was created but could not be saved");
        }

        const htmlUrl = getGitRepoHtmlUrl(savedRepo);

        return {
          status: "ok",
          repo: { ...savedRepo, html_url: htmlUrl },
          forgejo_url: htmlUrl,
        };
      } catch (error) {
        return {
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Repository was created in Forgejo but could not be saved",
        };
      }
    },
  });

export const createProjectAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Creates and saves a new project using the complete validated project configuration. Call this only after the user has confirmed the final configuration.",
    inputSchema: projectConfigValidator,
    execute: async (rawInput: z.infer<typeof projectConfigValidator>) => {
      const parsingResponse = projectConfigValidator.safeParse(rawInput);
      if (!parsingResponse.success) {
        return { status: "error", error: String(parsingResponse.error) };
      }

      try {
        const project = await createProjectWithConfigAndUserIdService(
          parsingResponse.data,
          userId,
        );
        return {
          status: "ok",
          message: `Your project was created: ${env.FRONTEND_URL}/projects/${project.id}`,
        };
      } catch (error) {
        return { status: "error", error: String(error) };
      }
    },
  });

const updateProjectSchema = projectConfigValidator.extend({
  projectId: z.string().describe("ID of the project to update"),
});

export const updateProjectAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Replaces an existing project's saved configuration. Call this only after the user has confirmed the complete updated configuration.",
    inputSchema: updateProjectSchema,
    execute: async (rawInput: z.infer<typeof updateProjectSchema>) => {
      const parsingResponse = updateProjectSchema.safeParse(rawInput);
      if (!parsingResponse.success) {
        return { status: "error", error: String(parsingResponse.error) };
      }

      try {
        const project = await udpateProjectConfigByProjectIdAndUserId(
          parsingResponse.data,
          userId,
        );
        return {
          status: "ok",
          details: `Your project was updated: ${env.FRONTEND_URL}/projects/${project.id}`,
        };
      } catch (error) {
        return { status: "error", error: String(error) };
      }
    },
  });

const listProjectFilesSchema = z.object({
  projectId: z.string().describe("ID of the project whose files to list"),
});

export const listProjectFilesAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Lists the files attached to an active project. Use this to find a project file ID before reading or updating that file.",
    inputSchema: listProjectFilesSchema,
    execute: async ({ projectId }: z.infer<typeof listProjectFilesSchema>) => {
      const rows = await db
        .select({ projectFiles })
        .from(projectFiles)
        .innerJoin(
          projects,
          and(
            eq(projects.id, projectFiles.project_id),
            eq(projects.user_id, userId),
            eq(projects.deleted, false),
          ),
        )
        .where(eq(projectFiles.project_id, projectId));

      return JSON.stringify(rows.map((row) => row.projectFiles));
    },
  });

const readProjectFileSchema = z.object({
  projectFileId: z.string().describe("ID of the project file to read"),
  projectId: z.string().describe("ID of the project that owns the file"),
  version: z
    .number()
    .optional()
    .nullable()
    .default(null)
    .describe(
      "Specific file version to read; omit to read the current version",
    ),
});

export const readProjectFileAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Reads and decrypts the content of a project file. Use a version number to retrieve a specific saved version, or omit it for the current content.",
    inputSchema: readProjectFileSchema,
    execute: async ({
      projectFileId,
      projectId,
      version,
    }: z.infer<typeof readProjectFileSchema>) => {
      const versionFilter =
        version !== null ? [eq(projectFileData.version, version)] : [];
      const [row] = await db
        .select({ projectFileData })
        .from(projectFileData)
        .innerJoin(
          projectFiles,
          and(
            eq(projectFiles.id, projectFileId),
            eq(projectFiles.project_id, projectId),
            eq(projectFileData.project_file_id, projectFiles.id),
          ),
        )
        .innerJoin(
          projects,
          and(
            eq(projects.id, projectId),
            eq(projects.user_id, userId),
            eq(projects.deleted, false),
            ...versionFilter,
          ),
        )
        .where(eq(projectFileData.project_file_id, projectFileId))
        .orderBy(desc(projectFileData.version))
        .limit(1);

      if (!row?.projectFileData) {
        return JSON.stringify({
          ok: false,
          error: "File not found or unauthorized",
        });
      }

      return JSON.stringify({
        ok: true,
        content: decryptData({
          iv: row.projectFileData.iv,
          tag: row.projectFileData.tag,
          encrypted: row.projectFileData.encrypted_content,
        }),
      });
    },
  });

const updateProjectFileSchema = z.object({
  projectFileId: z.string().describe("ID of the project file to update"),
  projectId: z.string().describe("ID of the project that owns the file"),
  content: z.string().describe("Complete replacement content for the file"),
});

export const updateProjectFileAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Replaces a project file's content and saves a new encrypted version when the content changed. Use this only after the user has approved the new complete content.",
    inputSchema: updateProjectFileSchema,
    execute: async ({
      projectFileId,
      projectId,
      content,
    }: z.infer<typeof updateProjectFileSchema>) => {
      try {
        const [projectFile] = await db
          .select({ id: projectFiles.id })
          .from(projectFiles)
          .innerJoin(
            projects,
            and(
              eq(projects.id, projectFiles.project_id),
              eq(projects.user_id, userId),
              eq(projects.deleted, false),
            ),
          )
          .where(
            and(
              eq(projectFiles.id, projectFileId),
              eq(projectFiles.project_id, projectId),
            ),
          );

        if (!projectFile) {
          return JSON.stringify({
            ok: false,
            error: "File not found or unauthorized",
          });
        }

        const [latestData] = await db
          .select()
          .from(projectFileData)
          .where(eq(projectFileData.project_file_id, projectFileId))
          .orderBy(desc(projectFileData.version))
          .limit(1);

        if (latestData) {
          const latestContent = decryptData({
            iv: latestData.iv,
            tag: latestData.tag,
            encrypted: latestData.encrypted_content,
          });
          if (latestContent === content) {
            return JSON.stringify({
              ok: true,
              changed: false,
              version: latestData.version,
              message: "File content is already up to date",
            });
          }
        }

        const encrypted = encryptData(content);
        const [newFileData] = await db
          .insert(projectFileData)
          .values({
            project_file_id: projectFileId,
            version: latestData ? latestData.version + 1 : 1,
            encrypted_content: encrypted.encryptedData,
            iv: encrypted.iv,
            tag: encrypted.tag,
          })
          .returning({
            id: projectFileData.id,
            version: projectFileData.version,
          });

        return JSON.stringify({
          ok: true,
          changed: true,
          fileData: newFileData,
        });
      } catch (error) {
        return JSON.stringify({ ok: false, error: String(error) });
      }
    },
  });

const createProjectFileSchema = z.object({
  projectId: z.string().describe("ID of the project that will own the file"),
  path: z.string().describe("Path of the file within the project"),
  name: z.string().describe("Display name of the file"),
  content: z.string().describe("Initial complete content for the file"),
});

export const createProjectFileAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Creates a project file and stores its initial content as encrypted version 1. Use this only after the user has approved the file path, name, and complete content.",
    inputSchema: createProjectFileSchema,
    execute: async ({
      projectId,
      path,
      name,
      content,
    }: z.infer<typeof createProjectFileSchema>) => {
      try {
        const newFile = await db.transaction(async (tx) => {
          const [project] = await tx
            .select({ id: projects.id })
            .from(projects)
            .where(
              and(
                eq(projects.id, projectId),
                eq(projects.user_id, userId),
                eq(projects.deleted, false),
              ),
            );
          if (!project) return null;

          const [projectFile] = await tx
            .insert(projectFiles)
            .values({ project_id: projectId, path, name })
            .returning({
              id: projectFiles.id,
              project_id: projectFiles.project_id,
              path: projectFiles.path,
              name: projectFiles.name,
            });
          if (!projectFile) return null;

          const encrypted = encryptData(content);
          const [fileData] = await tx
            .insert(projectFileData)
            .values({
              project_file_id: projectFile.id,
              version: 1,
              encrypted_content: encrypted.encryptedData,
              iv: encrypted.iv,
              tag: encrypted.tag,
            })
            .returning({
              id: projectFileData.id,
              version: projectFileData.version,
            });

          return { ...projectFile, projectFileData: fileData };
        });

        if (!newFile) {
          return JSON.stringify({
            ok: false,
            error: "Project not found or unauthorized",
          });
        }
        return JSON.stringify({ ok: true, file: newFile });
      } catch (error) {
        return JSON.stringify({ ok: false, error: String(error) });
      }
    },
  });

const getProjectRepositoriesSchema = z.object({
  projectId: z
    .uuid("Project ID must be valid")
    .describe("ID of the project whose attached repositories to list"),
});

export const getProjectRepositoriesAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Lists all GitHub and Forgejo repositories attached to a project. Each result includes all saved repository fields except creation and update timestamps. Use this before planning project-session tasks so repository IDs, types, and workspace paths are not invented.",
    inputSchema: getProjectRepositoriesSchema,
    execute: async ({
      projectId,
    }: z.infer<typeof getProjectRepositoriesSchema>) => {
      const rows = await db
        .select({ repo: gitRepos })
        .from(projects)
        .leftJoin(projectGitRepos, eq(projectGitRepos.project_id, projects.id))
        .leftJoin(gitRepos, eq(gitRepos.id, projectGitRepos.github_repo_id))
        .where(
          and(
            eq(projects.user_id, userId),
            eq(projects.id, projectId),
            eq(projects.deleted, false),
          ),
        );

      if (rows.length === 0) {
        return { error: "Project not found or doesn't belong to you" };
      }

      return rows.flatMap(({ repo }) =>
        repo
          ? [
              {
                id: repo.id,
                user_id: repo.user_id,
                type: repo.type,
                default_project_id: repo.default_project_id,
                installation_id: repo.installation_id,
                auto_review_pull_requests_enabled:
                  repo.auto_review_pull_requests_enabled,
                auto_fix_issues_enabled: repo.auto_fix_issues_enabled,
                overview: repo.overview,
                public: repo.public,
                full_name: repo.full_name,
                repo_owner_username: repo.repo_owner_username,
                setup_script: repo.setup_script,
              },
            ]
          : [],
      );
    },
  });

const createProjectSessionSchema = createInstanceSchema.extend({
  projectId: z
    .uuid("Project ID must be valid")
    .describe("ID of the project for which to create the session"),
  runtime: z
    .enum(instanceRuntimeKind.enumValues)
    .default("sandbox")
    .describe("Runtime to start for the session: sandbox or vm"),
});

export const createProjectSessionAgentTool = (userId: string): Tool =>
  tool({
    description:
      "Creates a project session with ordered repository tasks and starts its paid runtime. Call this exactly once, only after listing the project's repositories, presenting the complete task plan and runtime, and receiving explicit user confirmation.",
    inputSchema: createProjectSessionSchema,
    execute: async (rawData: z.infer<typeof createProjectSessionSchema>) => {
      try {
        const input = createProjectSessionSchema.parse(rawData);
        const { projectSession } = await createProjectSessionInstance({
          userId,
          input,
          runtime: input.runtime,
          terminate: true,
        });

        return {
          success: true,
          sessionId: projectSession.id,
          message: "Project session created and instance started successfully.",
        };
      } catch (error) {
        if (error instanceof AppError) {
          return { success: false, error: error.message };
        }

        console.error("Failed to create project session from AI tool", error);
        return {
          success: false,
          error: "Could not create the project session. Please try again.",
        };
      }
    },
  });
