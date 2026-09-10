import { and, db, eq, gitRepos } from "@repo/db";
import { z } from "@repo/shared";
import { Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { getForgejoPrOrIssues } from "../../services/forgejo/pr-or-issue-actions.js";

const activityQuerySchema = z.object({
  type: z.enum(["pr", "issue"]),
  page: z.coerce.number().int().positive().default(1),
  count: z.coerce.number().int().positive().max(50).default(20),
});

export const getGitRepoPrOrIssues = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authorization is required", 401);

    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { type, page, count } = activityQuerySchema.parse(req.query);

    const [repo] = await db
      .select()
      .from(gitRepos)
      .where(and(eq(gitRepos.id, id), eq(gitRepos.user_id, user.id)))
      .limit(1);

    if (!repo) throw new AppError("Repo not found", 404);

    // This endpoint is provider-neutral. GitHub support can be added here
    // without changing the public route or its response shape.
    if (repo.type !== "forgejo") {
      throw new AppError(
        "Pull requests and issues are not supported for this provider yet",
        501,
      );
    }

    const repoName = repo.full_name.split("/").slice(1).join("/");
    if (!repoName) throw new AppError("Repository name is invalid", 500);

    const items = await getForgejoPrOrIssues({
      owner: repo.repo_owner_username,
      repo: repoName,
      type,
      page,
      count,
    });

    const data = items.map((item) => ({
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
    }));

    res.status(200).json({
      data,
      pagination: {
        page,
        count,
        hasMore: data.length === count,
      },
    });
  },
);
