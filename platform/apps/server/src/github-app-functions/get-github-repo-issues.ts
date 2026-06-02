import { githubRepos } from "@repo/db";
import { Endpoints } from "@octokit/types";
import { octokitApp } from "../webhooks/github/index.js";

export type GithubRepoIssue =
  Endpoints["GET /repos/{owner}/{repo}/issues"]["response"]["data"][number];

export const getGithubRepoIssues = async (
  repo: typeof githubRepos.$inferSelect,
): Promise<GithubRepoIssue[]> => {
  const installationOctokit = await octokitApp.getInstallationOctokit(
    repo.installation_id,
  );

  const { data } = await installationOctokit.request(
    "GET /repos/{owner}/{repo}/issues",
    {
      owner: repo.repo_owner_username,
      repo: repo.full_name.split("/")[1]!,
    },
  );

  return data;
};
