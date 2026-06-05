import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { getRepoAccessDetails } from "../../github-app-functions/get-repo-access-details.js";
import { db, githubRepos, eq, and, projects, desc } from "@repo/db";
import { createGithubRepoSchema, z } from "@repo/shared";
import { getGithubRepoIssues } from "../../github-app-functions/get-github-repo-issues.js";
import { getGithubRepoPullRequests } from "../../github-app-functions/get-github-repo-pull-requests.js";

type GithubRepoIssueResponse = {
  url: string;
  html_url: string;
  id: number;
  number: number;
  repository_url: string;
  title: string;
  state: string;
  body: string | null;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user?: {
    login: string;
    avatar_url: string;
  };
  labels: {
    id?: number;
    name: string | null;
    color: string | null;
  }[];
};

type GithubRepoPullRequestResponse = {
  url: string;
  html_url: string;
  id: number;
  number: number;
  title: string;
  state: string;
  body: string | null;
  draft: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user?: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
};

export const getUserGitRepos = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const rows = await db
      .select()
      .from(githubRepos)
      .where(eq(githubRepos.user_id, user.id))
      .orderBy(desc(githubRepos.created_at));

    res.status(200).json({ data: rows });
  },
);

export const getGithubRepoById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const { id } = z
      .object({
        id: z.string(),
      })
      .parse(req.params);

    const { include } = z
      .object({
        include: z.enum(["issues", "pull_requests"]).optional().nullable(),
      })
      .parse(req.query);

    const [githubRepo] = await db
      .select()
      .from(githubRepos)
      .where(and(eq(githubRepos.id, id), eq(githubRepos.user_id, user.id)));

    if (!githubRepo) throw new AppError("Repo not found", 404);
    let issues: GithubRepoIssueResponse[] = [];
    let pull_requests: GithubRepoPullRequestResponse[] = [];
    if (include === "issues") {
      const rawIssues = await getGithubRepoIssues(githubRepo);
      issues = rawIssues.map((issue) => {
        return {
          url: issue.url,
          html_url: issue.html_url,
          id: issue.id,
          number: issue.number,
          repository_url: issue.repository_url,
          title: issue.title,
          state: issue.state,
          body: issue.body ?? null,
          comments: issue.comments,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          closed_at: issue.closed_at,
          labels: (issue.labels ?? []).map((label) => {
            if (typeof label === "string") {
              return {
                name: label,
                color: null,
              };
            }

            return {
              ...(label.id === undefined ? {} : { id: label.id }),
              name: label.name ?? null,
              color: label.color ?? null,
            };
          }),
          ...(issue.user && {
            user: {
              login: issue.user.login,
              avatar_url: issue.user.avatar_url,
            },
          }),
        };
      });
    }

    if (include === "pull_requests") {
      const rawPullRequests = await getGithubRepoPullRequests(githubRepo);
      pull_requests = rawPullRequests.map((pullRequest) => {
        return {
          url: pullRequest.url,
          html_url: pullRequest.html_url,
          id: pullRequest.id,
          number: pullRequest.number,
          title: pullRequest.title,
          state: pullRequest.state,
          body: pullRequest.body ?? null,
          draft: pullRequest.draft ?? false,
          created_at: pullRequest.created_at,
          updated_at: pullRequest.updated_at,
          closed_at: pullRequest.closed_at,
          merged_at: pullRequest.merged_at,
          head: {
            ref: pullRequest.head.ref,
            sha: pullRequest.head.sha,
          },
          base: {
            ref: pullRequest.base.ref,
            sha: pullRequest.base.sha,
          },
          ...(pullRequest.user && {
            user: {
              login: pullRequest.user.login,
              avatar_url: pullRequest.user.avatar_url,
            },
          }),
        };
      });
    }

    res.status(200).json({
      data: {
        ...githubRepo,
        issues,
        pull_requests,
      },
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
