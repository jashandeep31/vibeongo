import { githubRepos } from "@repo/db";
import { Endpoints } from "@octokit/types";
import { octokitApp } from "../webhooks/github/index.js";

export type GithubRepoPullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls"]["response"]["data"][number];

export const getGithubRepoPullRequests = async (
  repo: typeof githubRepos.$inferSelect,
): Promise<GithubRepoPullRequest[]> => {
  const installationOctokit = await octokitApp.getInstallationOctokit(
    repo.installation_id,
  );

  const { data } = await installationOctokit.request(
    "GET /repos/{owner}/{repo}/pulls",
    {
      owner: repo.repo_owner_username,
      repo: repo.full_name.split("/")[1]!,
    },
  );

  return data;
};
