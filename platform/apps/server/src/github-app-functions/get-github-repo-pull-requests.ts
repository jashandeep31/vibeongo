import { gitRepos } from "@repo/db";
import { Endpoints } from "@octokit/types";
import { octokitApp } from "../webhooks/github/index.js";

export type GithubRepoPullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls"]["response"]["data"][number];
export type GithubRepoPullRequestDetails =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

export const getGithubRepoPullRequests = async (
  repo: typeof gitRepos.$inferSelect,
  pagination: { page?: number; count?: number } = {},
): Promise<GithubRepoPullRequest[]> => {
  const installationOctokit = await octokitApp.getInstallationOctokit(
    repo.installation_id,
  );

  const { data } = await installationOctokit.request(
    "GET /repos/{owner}/{repo}/pulls",
    {
      owner: repo.repo_owner_username,
      repo: repo.full_name.split("/")[1]!,
      page: pagination.page,
      per_page: pagination.count,
    },
  );

  return data;
};

export const getGithubRepoPullRequest = async (
  repo: typeof gitRepos.$inferSelect,
  pullRequestNumber: number,
): Promise<GithubRepoPullRequestDetails> => {
  const installationOctokit = await octokitApp.getInstallationOctokit(
    repo.installation_id,
  );

  const { data } = await installationOctokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner: repo.repo_owner_username,
      repo: repo.full_name.split("/")[1]!,
      pull_number: pullRequestNumber,
    },
  );

  return data;
};
