import { customQuery, db, desc, eq, gitRepoAccessTokens } from "@repo/db";
import { commonFilterSchema } from "@repo/shared";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { revokeGitRepoAccessToken } from "../../services/git-repo-access-token/revoke-git-repo-access-token.js";

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

    const result = await revokeGitRepoAccessToken({
      tokenId: id,
      reason: "manual",
      userId: user.id,
    });

    if (result.alreadyRevoked) {
      res.status(200).json({ message: "Git access token is already revoked" });
      return;
    }

    res.status(200).json({ message: "Git access token revoked" });
  },
);
