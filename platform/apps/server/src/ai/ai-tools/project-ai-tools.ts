import {
  and,
  asc,
  db,
  eq,
  githubRepos,
  instanceRegions,
  instanceTypes,
  projectFiles,
  projects,
  sshKeys,
} from "@repo/db";
import { tool, Tool } from "ai";
import { z } from "zod";
import { getRepoAccessDetails } from "../../github-app-functions/get-repo-access-details.js";
import { AppError } from "../../lib/app-error.js";
import { getDecryptedProjectConfig } from "../../services/project/project-config.js";
import {
  projectConfigValidator,
  projectValidatorForAIInput,
} from "@repo/shared";
import { createProjectWithConfigAndUserIdService } from "../../services/project/create-project-service.js";
import { env } from "../../lib/env.js";
import { udpateProjectConfigByProjectIdAndUserId } from "../../services/project/update-project-service.js";

export const updateConfigInMemAITool: Tool = tool({
  description:
    "After making any changes in config make a call to this tool it update local meomoy",
  inputSchema: projectValidatorForAIInput.extend({}),
  execute: async (data: unknown) => {
    const valid = projectValidatorForAIInput.parse(data);
    return valid;
  },
});

export const getCurrentConfigAITool = (config: unknown): Tool =>
  tool({
    description: "Get the current to read check what we already have",
    inputSchema: z.object(),
    execute: async () => {
      if (!config) return {};
      if (typeof config !== "string") return config;
      try {
        return JSON.parse(config);
      } catch {
        return {};
      }
    },
  });
const updateProjectByIdSchema = projectConfigValidator.extend({
  projectId: z.string(),
});
export const updateProjectByIdTool = (userId: string): Tool =>
  tool({
    description:
      "Update the users pre configureed to the daatabase after the full conformation from the user ",
    inputSchema: updateProjectByIdSchema,
    execute: async (rawInput: z.infer<typeof updateProjectByIdSchema>) => {
      try {
        const parsingResponse = updateProjectByIdSchema.safeParse(rawInput);
        if (parsingResponse.error) {
          return {
            status: "error",
            error: String(parsingResponse.error),
          };
        }
        const updatedProject = await udpateProjectConfigByProjectIdAndUserId(
          parsingResponse.data,
          userId,
        );

        return {
          status: "ok",
          details: `You project is updated you can check at:${env.FRONTEND_URL}/projects/${updatedProject.id}`,
        };
      } catch (e) {
        return {
          status: "error",
          error: String(e),
        };
      }
    },
  });

export const createAndSaveProjectTool = (userId: string): Tool =>
  tool({
    description:
      "This final to be needed to only called when wanna save the project to database",
    inputSchema: projectConfigValidator,
    execute: async (rawInput: z.infer<typeof projectConfigValidator>) => {
      try {
        const parsingResponse = projectConfigValidator.safeParse(rawInput);
        if (parsingResponse.error) {
          return {
            status: "error",
            error: String(parsingResponse.error),
          };
        }
        const parsedData = parsingResponse.data;
        const resp = await createProjectWithConfigAndUserIdService(
          parsedData,
          userId,
        );
        return {
          status: "ok",
          message: `Your is project is created check at: ${env.FRONTEND_URL}/projects/${resp.id}`,
        };
      } catch (e) {
        return {
          status: "error",
          error: String(e),
        };
      }
    },
  });

export const getUserReposAITool = (userId: string): Tool =>
  tool({
    description: "Get list of all user repos to suggest user which one to add",
    inputSchema: z.object({}),
    execute: async () => {
      const repos = await db
        .select()
        .from(githubRepos)
        .where(eq(githubRepos.user_id, userId));

      const res = repos.map((r) => ({
        full_name: r.full_name,
        id: r.id,
        public: r.public,
        setup_script: r.setup_script,
      }));
      return res;
    },
  });

const getOtherProjectConfigSchema = z.object({
  id: z.uuid(),
});

export const getAllProjectNameAndIds = (userId: string): Tool =>
  tool({
    description:
      "Get list of all user projects  it provides access to the user project name and ids",
    inputSchema: z.object({}),
    execute: async () => {
      return await db
        .select({ name: projects.name, id: projects.id })
        .from(projects)
        .where(and(eq(projects.user_id, userId), eq(projects.deleted, false)));
    },
  });
export const getOtherProjectConfigById = (userId: string): Tool =>
  tool({
    description:
      "Provide the config of the other project incase its needed to getsomething form it",
    inputSchema: getOtherProjectConfigSchema,
    toModelOutput: ({ output }) => ({
      type: "text",
      value: JSON.stringify(output),
    }),
    execute: async (input: z.infer<typeof getOtherProjectConfigSchema>) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.user_id, userId),
            eq(projects.id, input.id),
            eq(projects.deleted, false),
          ),
        );

      if (!project) {
        return {
          error: "Project not found or doesn't belong to you",
        };
      }
      const decryptedConfig = await getDecryptedProjectConfig(project.id);

      let config: unknown;
      try {
        config = JSON.parse(decryptedConfig);
      } catch {
        return {
          error: "Project config is not valid JSON",
        };
      }

      return {
        project: {
          ...project,
          config,
        },
      };
    },
  });
export const getUserSshKeysAITool = (userId: string): Tool =>
  tool({
    description:
      "Get the user's SSH keys so the user can choose which keys to add to the project",
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

export const getInstanceCatalogAITool = (): Tool =>
  tool({
    description:
      "Get available instance regions and instance types so the user can choose where the project should run",
    inputSchema: z.object({}),
    execute: async () => {
      const [regions, types] = await Promise.all([
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
      ]);

      return regions.map((region) => ({
        ...region,
        instanceTypes: types.filter((type) => type.region_id === region.id),
      }));
    },
  });

const createNewGithubRepoSchema = z.object({
  url: z.string(),
  setup_script: z.string().optional().default(" "),
});
export const createNewGithubRepo = (userId: string): Tool =>
  tool({
    description:
      "Add new github repo for user by repourl, url should be like https://github.com/USERNAME/REPO_NAME",
    inputSchema: createNewGithubRepoSchema,
    execute: async (inputData: z.infer<typeof createNewGithubRepoSchema>) => {
      const parsedData = createNewGithubRepoSchema.parse(inputData);
      let owner = "";
      let repoName = "";
      try {
        const parsedUrl = new URL(parsedData.url);
        const parts = parsedUrl.pathname.split("/").filter(Boolean);
        if (parts.length < 2 || !parts[0] || !parts[1])
          throw new Error("Invalid URL path");
        owner = parts[0];
        repoName = parts[1].replace(".git", "");
      } catch (e) {
        throw new AppError("Invalid GitHub repository URL", 400);
      }

      const result = await getRepoAccessDetails({
        owner,
        repo: repoName,
      });

      if (!result.hasAppAccess)
        throw new AppError("App access is required", 400);

      const { isPublic, repoData } = result;
      const newRepo = await db
        .insert(githubRepos)
        .values({
          user_id: userId,
          installation_id: result.installationId,
          full_name: repoData.full_name as string,
          repo_owner_username: repoData.owner.login as string,
          setup_script: parsedData.setup_script,
          public: isPublic,
        })
        .returning();

      return newRepo;
    },
  });

const getProjectFilesSchema = z.object({
  projectId: z.string(),
});
export const getProjectFilesAITool = (userId: string): Tool =>
  tool({
    description: "return all the env files",
    inputSchema: getProjectFilesSchema,
    execute: async (rawData: z.infer<typeof getProjectFilesSchema>) => {
      const data = getProjectFilesSchema.parse(rawData);
      const projectFileRows = await db
        .select({ projectFiles })
        .from(projectFiles)
        .innerJoin(
          projects,
          and(
            eq(projects.id, projectFiles.project_id),
            eq(projects.user_id, userId),
          ),
        )
        .where(and(eq(projectFiles.project_id, data.projectId)));

      const refinedRows = projectFileRows.map((i) => i.projectFiles);
      return JSON.stringify(refinedRows);
    },
  });
