import { catchAsync } from "../../lib/catch-async.js";
import { z } from "zod";
import { Request, Response } from "express";
import {
  eq,
  projectSessions,
  projects,
  instances,
  db,
  githubRepos,
  projectGithubRepos,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { getConfigReadyGithubRepos } from "../../github-app-functions/get-project-ready-github-repos.js";

// sending the renewed tokens
export const renewTokens = catchAsync(async (req: Request, res: Response) => {
  const { id, instanceId } = z
    .object({ id: z.string(), instanceId: z.string() })
    .parse(req.params);

  const [sessionRow] = await db
    .select({
      project_session: projectSessions,
      project: projects,
      instance: instances,
    })
    .from(projectSessions)
    .leftJoin(projects, eq(projects.id, projectSessions.project_id))
    .leftJoin(instances, eq(instances.id, instanceId))
    .where(eq(projectSessions.id, id));

  if (
    !sessionRow?.project_session ||
    !sessionRow?.project ||
    !sessionRow.instance
  )
    throw new AppError("Project session not found", 404);

  const { project } = sessionRow;

  const repos = await db
    .select({ repo: githubRepos })
    .from(projectGithubRepos)
    .leftJoin(
      githubRepos,
      eq(githubRepos.id, projectGithubRepos.github_repo_id),
    )
    .where(eq(projectGithubRepos.project_id, project.id));

  const validRepos = repos
    .map((r) => r.repo)
    .filter((r): r is typeof githubRepos.$inferSelect => r !== null);

  const config = {
    repos: await getConfigReadyGithubRepos(validRepos),
  };

  res.status(200).json({ data: config });
});
