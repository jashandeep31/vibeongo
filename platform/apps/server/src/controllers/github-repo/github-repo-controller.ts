import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { getRepoAccessDetails } from "../../github-app-functions/get-repo-access-details.js";
import { db, githubRepos, eq, and, projects } from "@repo/db";
import { createGithubRepoSchema, z } from "@repo/shared";

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

    const { url, setup_script } = createGithubRepoSchema.parse(req.body);

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
        installation_id: result.installationId,
        full_name: repoData.full_name as string,
        repo_owner_username: repoData.owner.login as string,
        setup_script: setup_script,
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

export const updateGithubRepoById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const { id } = req.params;
    if (!id || typeof id !== "string")
      throw new AppError("Repo id is required", 400);

    const { setup_script, default_project_id } = z
      .object({
        setup_script: z.string().default(""),
        default_project_id: z.string().nullable(),
      })
      .parse(req.body);

    let project = null;
    if (default_project_id) {
      const [projectRow] = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, default_project_id),
            eq(projects.user_id, user.id),
          ),
        );
      if (!projectRow) throw new AppError("Project not found", 404);
      project = projectRow;
    }
    await db
      .update(githubRepos)
      .set({
        setup_script,
        default_project_id: project?.id || null,
      })
      .where(and(eq(githubRepos.id, id), eq(githubRepos.user_id, user.id)));

    res.status(200).json({
      message: "Successfully updated the github repo",
    });
  },
);
