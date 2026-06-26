import {
  and,
  asc,
  db,
  eq,
  githubRepos,
  instanceRegions,
  instanceTypes,
  projects,
  sshKeys,
} from "@repo/db";
import { tool, Tool } from "ai";
import { z } from "zod";
import { getRepoAccessDetails } from "../../github-app-functions/get-repo-access-details.js";
import { AppError } from "../../lib/app-error.js";
import { getDecryptedProjectConfig } from "../../services/project/project-config.js";

export const getUserReposAITool = (userId: string): Tool =>
  tool({
    description: "Get list of all user repos to suggest user which one to add",
    strict: true,
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

const copyFromOtherProjectSchema = z.object({
  projectId: z.string(),
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
        .where(eq(projects.user_id, userId));
    },
  });
export const copyFromOtherProject = (userId: string): Tool =>
  tool({
    description:
      "Provide the access to the users other pre configured project so that copy the config from it to the new one ",
    strict: true,
    inputSchema: copyFromOtherProjectSchema,
    execute: async (input: z.infer<typeof copyFromOtherProjectSchema>) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.user_id, userId), eq(projects.id, input.projectId)),
        );

      if (!project) {
        return {
          error: "Project not found or doesn't belong to you",
        };
      }
      const decryptedConfig = await getDecryptedProjectConfig(project.id);
      return {
        ...project,
        config: decryptedConfig,
      };
    },
  });
export const getUserSshKeysAITool = (userId: string): Tool =>
  tool({
    description:
      "Get the user's SSH keys so the user can choose which keys to add to the project",
    strict: true,
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
    strict: true,
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
