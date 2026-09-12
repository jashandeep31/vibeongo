import {
  and,
  customQuery,
  db,
  desc,
  eq,
  gitRepoAccessTokens,
  gitRepos,
} from "@repo/db";
import { commonFilterSchema } from "@repo/shared";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { decryptData } from "../../lib/encryption-decryption.js";
import { forgejoAPIClient } from "../../services/forgejo/user-actions.js";
import { octokitApp } from "../../webhooks/github/index.js";

export const getUserGitRepoAccessTokens = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const { page, limit } = commonFilterSchema.parse(req.query);

    const rows = await customQuery(
      db
        .select({
          id: gitRepoAccessTokens.id,
          instance_id: gitRepoAccessTokens.instance_id,
          repo_id: gitRepoAccessTokens.repo_id,
          provider: gitRepoAccessTokens.provider,
          provider_token_id: gitRepoAccessTokens.provider_token_id,
          expires_at: gitRepoAccessTokens.expires_at,
          revoked_at: gitRepoAccessTokens.revoked_at,
          created_at: gitRepoAccessTokens.created_at,
          updated_at: gitRepoAccessTokens.updated_at,
        })
        .from(gitRepoAccessTokens)
        .where(eq(gitRepoAccessTokens.user_id, user.id))
        .orderBy(desc(gitRepoAccessTokens.created_at))
        .$dynamic(),
      page,
      limit,
    );

    res.status(200).json({
      data: rows.slice(0, limit),
      page,
      hasNext: rows.length > limit,
    });
  },
);

export const revokeUserGitRepoAccessToken = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

    const [row] = await db
      .select({
        token: gitRepoAccessTokens,
        repo_owner_username: gitRepos.repo_owner_username,
      })
      .from(gitRepoAccessTokens)
      .innerJoin(gitRepos, eq(gitRepos.id, gitRepoAccessTokens.repo_id))
      .where(
        and(
          eq(gitRepoAccessTokens.id, id),
          eq(gitRepoAccessTokens.user_id, user.id),
        ),
      );

    if (!row) throw new AppError("Git access token not found", 404);

    if (row.token.revoked_at) {
      res.status(200).json({ message: "Git access token is already revoked" });
      return;
    }

    if (row.token.provider === "forgejo") {
      if (!row.token.provider_token_id) {
        throw new AppError("Forgejo token identifier is missing", 409);
      }

      await forgejoAPIClient.delete(
        `/admin/users/${encodeURIComponent(row.repo_owner_username)}/tokens/${encodeURIComponent(row.token.provider_token_id)}`,
      );
    } else if (row.token.expires_at.getTime() > Date.now()) {
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
          eq(gitRepoAccessTokens.id, id),
          eq(gitRepoAccessTokens.user_id, user.id),
        ),
      );

    res.status(200).json({ message: "Git access token revoked" });
  },
);
