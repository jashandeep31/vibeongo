import { AppError } from "../../lib/appError.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { octokitApp } from "../../webhooks/github/handler.js";
import { checkAppInstallationInRepo } from "../../github-app-functions/check-appinstallation.js";

export const createGithubRepo = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const { url } = req.body;
    if (!url) throw new AppError("github repo url is required", 400);

    const repoInfo = await checkAppInstallationInRepo({
      owner: "jashandeep31",
      repo: "aichat",
    });
    //Things we have to do
    // 1. Check we have repo access or not
    // 3. IS the requrest is the real owner of the app
    // 2. Check repo is public not or not

    res.status(201).json({
      message: "Successfully had created the project intance",
    });
  },
);
