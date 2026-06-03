import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import { z } from "zod";
import { and, db, eq, githubRepos } from "@repo/db";
import { getIssueDetailByIssueNumber } from "../../github-app-functions/get-issue-or-pull-request-detail-by-number.js";
import { issueAndPullRequestHandler } from "../../services/github/issue-hanlder.js";

export const workOnIssueByIssueId = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const { id, issueNumber } = z
      .object({
        id: z.string(),
        issueNumber: z.coerce.number(),
      })
      .parse(req.params);

    const [githubRepo] = await db
      .select()
      .from(githubRepos)
      .where(and(eq(githubRepos.id, id), eq(githubRepos.user_id, user.id)));

    if (!githubRepo) throw new AppError("Repo not found", 404);

    const issueDetails = await getIssueDetailByIssueNumber({
      installation_id: githubRepo.installation_id,
      issue_number: issueNumber,
      full_repo_name: githubRepo.full_name,
    });

    // working on the issue
    await issueAndPullRequestHandler({
      gitRepoId: githubRepo.id,
      issue: issueDetails,
    });

    res.status(200).json({
      message: "Successfully updated the issue",
      data: issueDetails,
    });
  },
);
