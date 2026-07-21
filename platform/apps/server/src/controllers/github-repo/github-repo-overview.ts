import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { and, db, eq, githubRepos, gitRepoOverviewJobs } from "@repo/db";
import { addGitRepoOverviewJob } from "../../jobs/repo-overview.js";

export const createGithubRepoOverviewWithAI = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authorization is required", 401);

    const { id: repoId } = z
      .object({
        id: z.uuid(),
      })
      .parse(req.params);

    const [repo] = await db
      .select({ id: githubRepos.id })
      .from(githubRepos)
      .where(and(eq(githubRepos.id, repoId), eq(githubRepos.user_id, user.id)));

    if (!repo) throw new AppError("GitHub repository not found", 404);

    const [overviewJob] = await db
      .insert(gitRepoOverviewJobs)
      .values({
        repoId,
        userId: user.id,
      })
      .returning({ id: gitRepoOverviewJobs.id });

    if (!overviewJob) throw new AppError("Failed to create overview job", 500);

    try {
      await addGitRepoOverviewJob({
        overviewJobId: overviewJob.id,
        repoId,
        userId: user.id,
      });
    } catch (error) {
      await db
        .delete(gitRepoOverviewJobs)
        .where(eq(gitRepoOverviewJobs.id, overviewJob.id));
      throw error;
    }

    res.status(201).json({
      message: "GitHub repo overview job created successfully",
      data: { jobId: overviewJob.id },
    });
  },
);
