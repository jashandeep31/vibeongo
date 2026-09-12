import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { getRepoAccessDetails } from "../../github-app-functions/get-repo-access-details.js";
import { db, gitRepos, eq, and, projects, desc } from "@repo/db";
import { createGithubRepoSchema, z } from "@repo/shared";
import {
  createForgejoRepo,
  getForgejoRepo,
} from "../../services/forgejo/repo-actions.js";
import { FORGEJO_ACCOUNT_REQUIRED_MESSAGE } from "../../utils/defined-error-message.js";
import { withGitRepoHtmlUrl } from "../../services/github/git-repo-url.js";
import { getCachedForgejoUsername } from "../../cache/forgejo-username-cache.js";

export const getUserGitRepos = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const rows = await db
      .select()
      .from(gitRepos)
      .where(eq(gitRepos.user_id, user.id))
      .orderBy(desc(gitRepos.created_at));

    res.status(200).json({ data: rows.map(withGitRepoHtmlUrl) });
  },
);

export const getGitRepoById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const { id } = z
      .object({
        id: z.string(),
      })
      .parse(req.params);

    const [githubRepo] = await db
      .select()
      .from(gitRepos)
      .where(and(eq(gitRepos.id, id), eq(gitRepos.user_id, user.id)));

    if (!githubRepo) throw new AppError("Repo not found", 404);

    res.status(200).json({
      data: withGitRepoHtmlUrl(githubRepo),
    });
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
      .insert(gitRepos)
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
      data: newRepo.map(withGitRepoHtmlUrl),
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
      .delete(gitRepos)
      .where(and(eq(gitRepos.id, id as string), eq(gitRepos.user_id, user.id)))
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

    const {
      setup_script,
      default_project_id,
      auto_review_pull_requests_enabled,
      auto_fix_issues_enabled,
    } = z
      .object({
        setup_script: z.string().optional(),
        default_project_id: z.string().nullable().optional(),

        auto_review_pull_requests_enabled: z.boolean().optional(),
        auto_fix_issues_enabled: z.boolean().optional(),
      })
      .parse(req.body);

    if (default_project_id !== undefined && default_project_id !== null) {
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
    }

    await db
      .update(gitRepos)
      .set({
        ...(setup_script !== undefined ? { setup_script } : {}),
        ...(default_project_id !== undefined ? { default_project_id } : {}),
        ...(auto_review_pull_requests_enabled !== undefined
          ? { auto_review_pull_requests_enabled }
          : {}),
        ...(auto_fix_issues_enabled !== undefined
          ? { auto_fix_issues_enabled }
          : {}),
      })
      .where(and(eq(gitRepos.id, id), eq(gitRepos.user_id, user.id)));

    res.status(200).json({
      message: "Successfully updated the github repo",
    });
  },
);

export const createForgejoRepoController = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authorization is required", 401);
    if (user.forgejo_id === null)
      throw new AppError(FORGEJO_ACCOUNT_REQUIRED_MESSAGE, 409);

    const forgejoUsername = await getCachedForgejoUsername(user.forgejo_id);

    const { reponame } = z
      .object({
        reponame: z.string(),
      })
      .parse(req.body);

    let forgejoRepo = await getForgejoRepo({
      username: forgejoUsername,
      reponame,
    });

    if (!forgejoRepo) {
      const createdRepo = await createForgejoRepo({
        username: forgejoUsername,
        reponame,
      });

      if (createdRepo.status === "error") {
        throw new AppError(createdRepo.error, 500);
      }

      forgejoRepo = createdRepo.repo;
    }

    await db.insert(gitRepos).values({
      type: "forgejo",
      installation_id: forgejoRepo.id,
      full_name: forgejoRepo.full_name,
      repo_owner_username: forgejoUsername,
      setup_script: ``,
      public: !forgejoRepo.private,
      user_id: user.id,
    });

    res.status(201).json({
      message: "Forgejo repo is added",
    });
  },
);
