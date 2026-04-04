import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import {
  and,
  db,
  eq,
  githubRepos,
  projectGithubRepos,
  projects,
  projectSshKeys,
  sshKeys,
} from "@repo/db";
import { getConfigReadyGithubRepos } from "../../github-app-functions/get-project-ready-github-repos.js";
import { z } from "zod";

export const getProjectConfigById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 400);

    const { id } = z.object({ id: z.string() }).parse(req.params);

    const [projectRow] = await db
      .select({ project: projects })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.user_id, user.id)));

    if (!projectRow?.project) throw new AppError("Project not found", 404);

    const { project } = projectRow;

    const [repos, keys] = await Promise.all([
      db
        .select({ repo: githubRepos })
        .from(projectGithubRepos)
        .leftJoin(
          githubRepos,
          eq(githubRepos.id, projectGithubRepos.github_repo_id),
        )
        .where(eq(projectGithubRepos.project_id, project.id)),

      db
        .select({ value: sshKeys.value })
        .from(projectSshKeys)
        .leftJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id))
        .where(eq(projectSshKeys.project_id, project.id)),
    ]);

    const validRepos = repos
      .map((r) => r.repo)
      .filter((r): r is typeof githubRepos.$inferSelect => r !== null);

    const config = {
      ...(project.config as any),
      repos: await getConfigReadyGithubRepos(validRepos),
      ssh_keys: keys.map((k) => k.value).filter((v): v is string => !!v),
      tasks: [
        {
          folder_name: "aichat",
          task: "can please fix the current landing page create a plan.md that what we can imporove",
        },
      ],
    };

    res.status(200).json({ data: config });
  },
);
