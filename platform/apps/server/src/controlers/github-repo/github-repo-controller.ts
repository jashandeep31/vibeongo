import { AppError } from "../../lib/appError.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { getRepoAccessDetails } from "../../github-app-functions/get-repo-access-details.js";
import { db, githubRepos, eq, and } from "@repo/db";
import { createGithubRepoSchema } from "@repo/shared";

export const getUserGitRepos = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const rows = await db
      .select()
      .from(githubRepos)
      .where(eq(githubRepos.user_id, user.id));

    res.status(200).json({ data: rows });
  },
);

// --- Create the github repo ---
export const createGithubRepo = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const { url } = createGithubRepoSchema.parse(req.body);

    let owner = "";
    let repoName = "";
    try {
      const parsedUrl = new URL(url);
      const parts = parsedUrl.pathname.split("/").filter(Boolean);
      if (parts.length < 2 || !parts[0] || !parts[1])
        throw new Error("Invalid URL path");
      owner = parts[0];
      repoName = parts[1].replace(".git", "");
    } catch (e) {
      throw new AppError("Invalid GitHub repository URL", 400);
    }

    const result = await getRepoAccessDetails({
      owner,
      repo: repoName,
    });

    if (!result.hasAppAccess) throw new AppError("App access is required", 400);

    const { isPublic, repoData } = result;

    if (!repoData || user.username !== repoData?.owner?.login)
      throw new AppError("You are not the owner of this repo", 400);

    const newRepo = await db
      .insert(githubRepos)
      .values({
        user_id: user.id,
        full_name: repoData.full_name as string,
        repo_owner_username: repoData.owner.login as string,
        public: isPublic,
      })
      .returning();

    res.status(201).json({
      message: "Successfully had created the project intance",
      data: newRepo,
    });
  },
);

// --- Delete the github repo ---
export const deleteGithubRepo = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const { id } = req.params;
    if (!id) throw new AppError("Repo id is required", 400);

    const deletedRepo = await db
      .delete(githubRepos)
      .where(
        and(eq(githubRepos.id, id as string), eq(githubRepos.user_id, user.id)),
      )
      .returning();

    if (deletedRepo.length === 0) {
      throw new AppError(
        "Repo not found or you don't have permission to delete it",
        404,
      );
    }

    res.status(200).json({
      message: "Successfully deleted the github repo",
      data: deletedRepo[0],
    });
  },
);
