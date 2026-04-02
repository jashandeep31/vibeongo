import { AppError } from "../../lib/appError.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { octokitApp } from "../../webhooks/github/handler.js";
import { getRepoAccessDetails } from "../../github-app-functions/get-repo-access-details.js";
import { db, githubRepos } from "@repo/db";

export const createGithubRepo = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const { url } = req.body;
    if (!url) throw new AppError("github repo url is required", 400);

    const { hasAppAccess, isPrivate, repoData } = await getRepoAccessDetails({
      owner: "jashandeep31",
      repo: "aichat",
    });

    if (!hasAppAccess) throw new AppError("App access is required", 400);
    if (user.username !== repoData.owner.login)
      throw new AppError("You are not the owner of this repo", 400);

    const repo = await db
      .insert(githubRepos)
      .values({
        user_id: user.id,
        full_name: repoData.full_name,
        repo_owner_username: repoData.owner.login,
        public: isPrivate,
      })
      .returning();
    res.status(201).json({
      message: "Successfully had created the project intance",
      data: repo,
    });
  },
);
