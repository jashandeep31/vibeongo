import { and, db, eq, gitRepos } from "@repo/db";
import { z } from "@repo/shared";
import { Request, Response } from "express";
import { getGithubRepoIssue } from "../../github-app-functions/get-github-repo-issues.js";
import { getGithubRepoPullRequest } from "../../github-app-functions/get-github-repo-pull-requests.js";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { getForgejoPrOrIssue } from "../../services/forgejo/pr-or-issue-actions.js";

const paramsSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["pr", "issue"]),
  number: z.coerce.number().int().positive(),
});

const getProviderErrorStatus = (error: unknown) => {
  if (typeof error !== "object" || error === null) return undefined;

  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }

  if ("response" in error) {
    const response = error.response as { status?: unknown } | undefined;
    if (typeof response?.status === "number") return response.status;
  }

  return undefined;
};

export const getGitRepoPrOrIssueDetails = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authorization is required", 401);

    const { id, type, number } = paramsSchema.parse(req.params);
    const [repo] = await db
      .select()
      .from(gitRepos)
      .where(and(eq(gitRepos.id, id), eq(gitRepos.user_id, user.id)))
      .limit(1);

    if (!repo) throw new AppError("Repo not found", 404);

    try {
      if (repo.type === "github") {
        if (type === "issue") {
          const issue = await getGithubRepoIssue(repo, number);
          res.status(200).json({
            data: {
              id: issue.id,
              number: issue.number,
              html_url: issue.html_url,
              title: issue.title,
              state: issue.state,
              body: issue.body ?? null,
              comments: issue.comments,
              created_at: issue.created_at,
              updated_at: issue.updated_at,
              closed_at: issue.closed_at,
              labels: (issue.labels ?? []).map((label) =>
                typeof label === "string"
                  ? { name: label, color: null }
                  : {
                      ...(label.id === undefined ? {} : { id: label.id }),
                      name: label.name ?? null,
                      color: label.color ?? null,
                    },
              ),
              ...(issue.user
                ? {
                    user: {
                      login: issue.user.login,
                      avatar_url: issue.user.avatar_url,
                    },
                  }
                : {}),
            },
          });
          return;
        }

        const pullRequest = await getGithubRepoPullRequest(repo, number);
        res.status(200).json({
          data: {
            id: pullRequest.id,
            number: pullRequest.number,
            html_url: pullRequest.html_url,
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
            ...(pullRequest.user
              ? {
                  user: {
                    login: pullRequest.user.login,
                    avatar_url: pullRequest.user.avatar_url,
                  },
                }
              : {}),
          },
        });
        return;
      }

      if (repo.type !== "forgejo") {
        throw new AppError("Repository provider is not supported", 501);
      }

      const repoName = repo.full_name.split("/").slice(1).join("/");
      if (!repoName) throw new AppError("Repository name is invalid", 500);

      const item = await getForgejoPrOrIssue({
        owner: repo.repo_owner_username,
        repo: repoName,
        type,
        number,
      });

      res.status(200).json({
        data: {
          id: item.id,
          number: item.number,
          html_url: item.html_url,
          title: item.title,
          state: item.state,
          body: item.body ?? null,
          created_at: item.created_at,
          updated_at: item.updated_at,
          closed_at: item.closed_at,
          user: {
            login: item.user.login || item.user.username || "",
            avatar_url: item.user.avatar_url,
          },
          ...(type === "issue"
            ? {
                comments: item.comments ?? 0,
                labels: item.labels ?? [],
              }
            : {
                draft: item.draft ?? false,
                merged_at: item.merged_at ?? null,
                head: item.head ?? { ref: "", sha: "" },
                base: item.base ?? { ref: "", sha: "" },
              }),
        },
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      if (getProviderErrorStatus(error) === 404) {
        throw new AppError(
          `${type === "pr" ? "Pull request" : "Issue"} not found`,
          404,
        );
      }
      throw error;
    }
  },
);
