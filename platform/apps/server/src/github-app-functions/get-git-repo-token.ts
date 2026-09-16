import { db, gitRepoAccessTokens, gitRepos } from "@repo/db";
import { octokitApp } from "../webhooks/github/index.js";
import { getForgejoRepoAccessToken } from "../services/forgejo/repo-actions.js";
import { env } from "../lib/env.js";
import { encryptData } from "../lib/encryption-decryption.js";
import { addGitRepoAccessTokenRevocationJob } from "../jobs/git-repo-access-token-revocation.js";

export type GitRepoCredentials = {
  access_token: string;
  expires_at: string | null;
  provider_url: string;
  git_username: string;
};

const GITHUB_TOKEN_EXPIRY_SAFETY_WINDOW_MS = 5 * 60 * 1000;
const FORGEJO_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

export type GitRepoCredentialContext = {
  instanceId?: string;
};

export const getGitCloneUrl = (providerUrl: string, fullName: string): string =>
  `${providerUrl.replace(/\/+$/, "")}/${fullName.replace(/^\/+/, "")}.git`;

export const getGitRepoCredentials = async (
  repo: typeof gitRepos.$inferSelect,
  context: GitRepoCredentialContext = {},
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
    const encryptedToken = encryptData(data.token);

    const expiresAt = new Date(data.expires_at);
    const [tokenRow] = await db
      .insert(gitRepoAccessTokens)
      .values({
        user_id: repo.user_id,
        instance_id: context.instanceId,
        repo_id: repo.id,
        provider: "github",
        encrypted_token: encryptedToken.encryptedData,
        token_iv: encryptedToken.iv,
        token_tag: encryptedToken.tag,
        expires_at: expiresAt,
      })
      .returning({ id: gitRepoAccessTokens.id });

    if (tokenRow) {
      try {
        await addGitRepoAccessTokenRevocationJob({
          tokenId: tokenRow.id,
          reason: "expired",
          expiresAt,
        });
      } catch (error) {
        console.error(
          `Could not schedule GitHub token ${tokenRow.id} for cleanup`,
          error,
        );
      }
    }

    return {
      access_token: data.token,
      expires_at: new Date(
        new Date(data.expires_at).getTime() -
          GITHUB_TOKEN_EXPIRY_SAFETY_WINDOW_MS,
      ).toISOString(),
      provider_url: "https://github.com",
      git_username: "x-access-token",
    };
  }

  const { accessToken, tokenId } = await getForgejoRepoAccessToken({
    username: repo.repo_owner_username,
    reponame: repo.full_name.split("/").pop()!,
  });
  const expiresAt = new Date(Date.now() + FORGEJO_TOKEN_EXPIRY_MS);

  const [tokenRow] = await db
    .insert(gitRepoAccessTokens)
    .values({
      user_id: repo.user_id,
      instance_id: context.instanceId,
      repo_id: repo.id,
      provider: "forgejo",
      provider_token_id: String(tokenId),
      expires_at: expiresAt,
    })
    .returning({ id: gitRepoAccessTokens.id });

  if (tokenRow) {
    try {
      await addGitRepoAccessTokenRevocationJob({
        tokenId: tokenRow.id,
        reason: "expired",
        expiresAt,
      });
    } catch (error) {
      console.error(
        `Could not schedule Forgejo token ${tokenRow.id} for revocation`,
        error,
      );
    }
  }

  return {
    access_token: accessToken,
    expires_at: expiresAt.toISOString(),
    provider_url: env.FORGEJO_URL.replace(/\/+$/, ""),
    git_username: repo.repo_owner_username,
  };
};
