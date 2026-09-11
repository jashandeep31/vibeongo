import { gitRepos } from "@repo/db";
import { getGitRepoCredentials } from "./get-git-repo-token.js";

export type ProjectReadyGitRepo = {
  type: "github" | "forgejo";
  full_name: string;
  access_token: string;
  provider_url: string;
  git_username: string;
  public: boolean;
  folder_name: string;
  setup_script: string;
};

export const getConfigReadyGitRepos = async (
  repos: (typeof gitRepos.$inferSelect)[],
): Promise<ProjectReadyGitRepo[]> => {
  return Promise.all(
    repos.map(async (repo) => {
      const folder_name = repo.full_name.split("/").pop()!;
      const credentials = await getGitRepoCredentials(repo);
      return {
        type: repo.type ?? "github",
        full_name: repo.full_name,
        ...credentials,
        repo_name: repo.full_name.split("/")[1],
        public: repo.public,
        folder_name,
        setup_script: repo.setup_script,
      };
    }),
  );
};
