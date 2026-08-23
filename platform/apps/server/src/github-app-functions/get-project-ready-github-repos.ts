import { gitRepos } from "@repo/db";
import { getGitRepoCredentials } from "./get-git-repo-token.js";

export type ProjectReadyGitRepo = {
  full_name: string;
  access_token: string;
  http_url: string;
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
        full_name: repo.full_name,
        ...credentials,
        public: repo.public,
        folder_name,
        setup_script: repo.setup_script,
      };
    }),
  );
};
