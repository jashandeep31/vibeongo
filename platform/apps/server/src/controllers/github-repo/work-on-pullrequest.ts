import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import z from "zod";
import { db, githubRepos, eq, and } from "@repo/db";
import { getPullRequestDetailByPullNumber } from "../../github-app-functions/get-issue-or-pull-request-detail-by-number.js";
import { pullRequestOpenedHandler } from "../../services/github/pull-request-handler.js";

export const workOnPullRequestByPrNumber = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 403);

    const { id, prNumber } = z
      .object({
        id: z.string(),
        prNumber: z.coerce.number(),
      })
      .parse(req.params);

    const [githubRepo] = await db
      .select()
      .from(githubRepos)
      .where(and(eq(githubRepos.id, id), eq(githubRepos.user_id, user.id)));

    if (!githubRepo) throw new AppError("Repo not found", 404);

    const pr = await getPullRequestDetailByPullNumber({
      installation_id: githubRepo.installation_id,
      full_repo_name: githubRepo.full_name,
      pull_number: prNumber,
    });
    const instance = await pullRequestOpenedHandler({
      gitRepoId: githubRepo.id,
      pr,
    });

    if (!instance) throw new AppError("Something went wrong", 500);
    res.status(200).json({
      data: {
        instanceId: instance.id,
        projectId: instance?.project_id,
      },
    });
  },
);
