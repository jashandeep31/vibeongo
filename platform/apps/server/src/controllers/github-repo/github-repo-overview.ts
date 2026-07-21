import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { db, gitRepoOverviewJobs } from "@repo/db";
import { addGitRepoOverviewJob } from "../../jobs/repo-overview.js";

export const createGithubRepoOverviewWithAI = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authorization is required", 401);

    const { repoId } = z
      .object({
        repoId: z.string(),
      })
      .parse(req.body);

    await db.insert(gitRepoOverviewJobs).values({
      repoId,
      userId: user.id,
    });
    await addGitRepoOverviewJob(repoId, user.id);

    res.status(201).json({
      message: "GitHub repo overview job created successfully",
    });
  },
);
