import { and, db, eq, gitRepoAccessTokens, gitRepos, isNull } from "@repo/db";
import axios from "axios";
import { AppError } from "../../lib/app-error.js";
import { decryptData } from "../../lib/encryption-decryption.js";
import { forgejoAPIClient } from "../forgejo/user-actions.js";
import { octokitApp } from "../../webhooks/github/index.js";

export type GitRepoAccessTokenRevocationReason =
  | "manual"
  | "expired"
  | "instance-terminated";

export async function revokeGitRepoAccessToken({
  tokenId,
  reason,
  userId,
}: {
  tokenId: string;
  reason: GitRepoAccessTokenRevocationReason;
  userId?: string;
}): Promise<{ alreadyRevoked: boolean }> {
  if (reason === "manual" && !userId) {
    throw new AppError("Authentication is required", 401);
  }

  const conditions = [eq(gitRepoAccessTokens.id, tokenId)];
  if (userId) conditions.push(eq(gitRepoAccessTokens.user_id, userId));

  const [row] = await db
    .select({
      token: gitRepoAccessTokens,
      repo_owner_username: gitRepos.repo_owner_username,
    })
    .from(gitRepoAccessTokens)
    .innerJoin(gitRepos, eq(gitRepos.id, gitRepoAccessTokens.repo_id))
    .where(and(...conditions));

  if (!row) throw new AppError("Git access token not found", 404);
  if (row.token.revoked_at) return { alreadyRevoked: true };

  const isExpired = row.token.expires_at.getTime() <= Date.now();
  if (reason === "expired" && !isExpired) {
    return { alreadyRevoked: false };
  }

  if (row.token.provider === "forgejo") {
    if (!row.token.provider_token_id) {
      throw new AppError("Forgejo token identifier is missing", 409);
    }
    try {
      await forgejoAPIClient.delete(
        `/admin/users/${encodeURIComponent(row.repo_owner_username)}/tokens/${encodeURIComponent(row.token.provider_token_id)}`,
      );
    } catch (error: unknown) {
      if (!axios.isAxiosError(error) || error.response?.status !== 404) {
        throw error;
      }
    }
  } else if (reason !== "expired" && !isExpired) {
    if (
      !row.token.encrypted_token ||
      !row.token.token_iv ||
      !row.token.token_tag
    ) {
      throw new AppError("GitHub token encryption data is incomplete", 409);
    }

    const accessToken = decryptData({
      encrypted: row.token.encrypted_token,
      iv: row.token.token_iv,
      tag: row.token.token_tag,
    });

    await octokitApp.octokit.request("DELETE /installation/token", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
  }

  const revokedAt = new Date();
  await db
    .update(gitRepoAccessTokens)
    .set({
      revoked_at: revokedAt,
      encrypted_token: null,
      token_iv: null,
      token_tag: null,
      updated_at: revokedAt,
    })
    .where(
      and(
        eq(gitRepoAccessTokens.id, tokenId),
        isNull(gitRepoAccessTokens.revoked_at),
      ),
    );

  return { alreadyRevoked: false };
}
