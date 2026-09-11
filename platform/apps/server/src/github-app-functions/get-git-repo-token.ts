import { gitRepos } from "@repo/db";
import { octokitApp } from "../webhooks/github/index.js";
import { getForgejoRepoAccessToken } from "../services/forgejo/repo-actions.js";
import { env } from "../lib/env.js";

export type GitRepoCredentials = {
  access_token: string;
  provider_url: string;
  git_username: string;
};

export const getGitCloneUrl = (providerUrl: string, fullName: string): string =>
  `${providerUrl.replace(/\/+$/, "")}/${fullName.replace(/^\/+/, "")}.git`;

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
      provider_url: "https://github.com",
      git_username: "x-access-token",
    };
  }

  const accessToken = await getForgejoRepoAccessToken({
    username: repo.repo_owner_username,
    reponame: repo.full_name.split("/").pop()!,
  });

  return {
    access_token: accessToken,
    provider_url: env.FORGEJO_URL.replace(/\/+$/, ""),
    git_username: repo.repo_owner_username,
  };
};
