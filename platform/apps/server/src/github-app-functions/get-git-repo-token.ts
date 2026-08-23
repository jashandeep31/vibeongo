import { gitRepos } from "@repo/db";
import { octokitApp } from "../webhooks/github/index.js";
import { getForgejoRepoAccessToken } from "../services/forgejo/repo-actions.js";
import { env } from "../lib/env.js";

export type GitRepoCredentials = {
  access_token: string;
  http_url: string;
  git_username: string;
};

export const getGitRepoCredentials = async (
  repo: typeof gitRepos.$inferSelect,
): Promise<GitRepoCredentials> => {
  if (repo.type === "github") {
    const { data } = await octokitApp.octokit.request(
      "POST /app/installations/{installation_id}/access_tokens",
      {
        installation_id: repo.installation_id,
        repositories: [repo.full_name.split("/").pop()!],
        permissions: {
          contents: "write", // read-only to contents
          metadata: "read", // required by GitHub alongside contents
          issues: "write",
          pull_requests: "write",
        },
      },
    );
    return {
      access_token: data.token,
      http_url: `https://github.com/${repo.full_name}.git`,
      git_username: "x-access-token",
    };
  }

  const accessToken = await getForgejoRepoAccessToken({
    username: repo.repo_owner_username,
    reponame: repo.full_name.split("/").pop()!,
  });

  return {
    access_token: accessToken,
    http_url: `${env.FORGEJO_URL.replace(/\/$/, "")}/${repo.full_name}.git`,
    git_username: repo.repo_owner_username,
  };
};
