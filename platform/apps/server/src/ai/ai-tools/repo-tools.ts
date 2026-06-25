import { db, eq, githubRepos } from "@repo/db";
import { tool, Tool } from "ai";
import { z } from "zod";
import { getRepoAccessDetails } from "../../github-app-functions/get-repo-access-details.js";
import { AppError } from "../../lib/app-error.js";

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
