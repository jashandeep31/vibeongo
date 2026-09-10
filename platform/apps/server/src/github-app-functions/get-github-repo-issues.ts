import { gitRepos } from "@repo/db";
import { Endpoints } from "@octokit/types";
import { octokitApp } from "../webhooks/github/index.js";

export type GithubRepoIssue =
  Endpoints["GET /repos/{owner}/{repo}/issues"]["response"]["data"][number];

export const getGithubRepoIssues = async (
  repo: typeof gitRepos.$inferSelect,
  pagination: { page?: number; count?: number } = {},
): Promise<GithubRepoIssue[]> => {
  const installationOctokit = await octokitApp.getInstallationOctokit(
    repo.installation_id,
  );

  const { data } = await installationOctokit.request(
    "GET /repos/{owner}/{repo}/issues",
    {
      owner: repo.repo_owner_username,
      repo: repo.full_name.split("/")[1]!,
      page: pagination.page,
      per_page: pagination.count,
    },
  );

  return data.filter((issue) => !issue.pull_request);
};

export const getGithubRepoIssue = async (
  repo: typeof gitRepos.$inferSelect,
  issueNumber: number,
): Promise<GithubRepoIssue> => {
  const installationOctokit = await octokitApp.getInstallationOctokit(
    repo.installation_id,
  );

  const { data } = await installationOctokit.request(
    "GET /repos/{owner}/{repo}/issues/{issue_number}",
    {
      owner: repo.repo_owner_username,
      repo: repo.full_name.split("/")[1]!,
      issue_number: issueNumber,
    },
  );

  if (data.pull_request) throw new Error("Requested item is a pull request");
  return data;
};
