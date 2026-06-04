import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import { z } from "zod";
import { issueRequestHandler } from "../../services/github/issue-hanlder.js";

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

    const instance = await issueRequestHandler({
      gitRepoId: id,
      issueNumber,
    });
    if (!instance) throw new AppError("Failed to work on the issue", 500);

    res.status(200).json({
      data: {
        instanceId: instance.id,
        projectId: instance.project_id,
      },
    });
  },
);
