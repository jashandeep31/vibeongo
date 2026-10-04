import { gitRepos } from "@repo/db";
import {
  getIssueDetailByIssueNumber,
  getPullRequestDetailByPullNumber,
} from "../../github-app-functions/get-issue-or-pull-request-detail-by-number.js";
import {
  ForgejoPrOrIssueType,
  getForgejoPrOrIssue,
} from "../forgejo/pr-or-issue-actions.js";

export interface RepoIssueOrPullRequest {
  title: string;
  body: string;
  html_url: string;
}

/**
 * Fetches an issue or pull request from the repo's provider (GitHub or Forgejo).
 */
export const getIssueOrPullRequestForRepo = async (
  repo: typeof gitRepos.$inferSelect,
  type: ForgejoPrOrIssueType,
  number: number,
): Promise<RepoIssueOrPullRequest> => {
  if (repo.type === "github") {
    const item =
      type === "issue"
        ? await getIssueDetailByIssueNumber({
            installation_id: repo.installation_id,
            full_repo_name: repo.full_name,
            issue_number: number,
          })
        : await getPullRequestDetailByPullNumber({
            installation_id: repo.installation_id,
            full_repo_name: repo.full_name,
            pull_number: number,
          });

    return {
      title: item.title,
      body: item.body ?? "",
      html_url: item.html_url,
    };
  }

  if (repo.type !== "forgejo") {
    throw new Error("Repository provider is not supported");
  }

  const repoName = repo.full_name.split("/").slice(1).join("/");
  if (!repoName) throw new Error("Repository name is invalid");

  const item = await getForgejoPrOrIssue({
    owner: repo.repo_owner_username,
    repo: repoName,
    type,
    number,
  });

  return {
    title: item.title,
    body: item.body ?? "",
    html_url: item.html_url,
  };
};
