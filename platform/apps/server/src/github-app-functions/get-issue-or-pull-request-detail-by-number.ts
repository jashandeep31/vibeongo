import { Endpoints } from "@octokit/types";
import { octokitApp } from "../webhooks/github/index.js";

export type GithubIssueDetail =
  Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}"]["response"]["data"];

export type GithubPullRequestDetail =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

interface GetIssueDetailByIssueNumberProps {
  issue_number: number;
  installation_id: number;
  full_repo_name: string;
}

interface GetPullRequestDetailByPullNumberProps {
  pull_number: number;
  installation_id: number;
  full_repo_name: string;
}

const getRepoOwnerAndName = (full_repo_name: string) => {
  const [owner, repo] = full_repo_name.split("/");
  if (!owner || !repo) throw new Error("Give correct repo name");

  return { owner, repo };
};

export const getIssueDetailByIssueNumber = async ({
  installation_id,
  full_repo_name,
  issue_number,
}: GetIssueDetailByIssueNumberProps): Promise<GithubIssueDetail> => {
  const { owner, repo } = getRepoOwnerAndName(full_repo_name);

  const octokit = await octokitApp.getInstallationOctokit(installation_id);

  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/issues/{issue_number}",
    {
      owner,
      repo,
      issue_number,
    },
  );

  return data;
};

export const getPullRequestDetailByPullNumber = async ({
  installation_id,
  full_repo_name,
  pull_number,
}: GetPullRequestDetailByPullNumberProps): Promise<GithubPullRequestDetail> => {
  const { owner, repo } = getRepoOwnerAndName(full_repo_name);

  const octokit = await octokitApp.getInstallationOctokit(installation_id);

  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner,
      repo,
      pull_number,
    },
  );

  return data;
};
