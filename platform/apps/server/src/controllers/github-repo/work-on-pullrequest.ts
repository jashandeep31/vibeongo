import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import z from "zod";
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

    const instance = await pullRequestOpenedHandler({
      gitRepoId: id,
      prNumber,
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
