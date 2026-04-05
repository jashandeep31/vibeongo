import { getGithubRepoToken } from "./get-github-repo-readonly-token.js";

export type ProjectReadyGithubRepo = {
  full_name: string;
  access_token: string | null;
  public: boolean;
  folder_name: string;
  setup_script: string;
};

type GithubRepoForProjectConfig = {
  full_name: string;
  public: boolean;
  installation_id: number;
  setup_script: string;
};

export const getConfigReadyGithubRepos = async (
  repos: GithubRepoForProjectConfig[],
): Promise<ProjectReadyGithubRepo[]> => {
  return Promise.all(
    repos.map(async (repo) => {
      const folder_name = repo.full_name.split("/").pop()!;
      const access_token = await getGithubRepoToken(
        folder_name,
        repo.installation_id,
      );
      return {
        full_name: repo.full_name,
        access_token,
        public: repo.public,
        folder_name,
        setup_script: repo.setup_script,
      };
    }),
  );
};
