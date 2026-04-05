import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { z } from "zod";
import {
  db,
  eq,
  githubRepos,
  projectGithubRepos,
  projectSessions,
  projectSessionTasks,
  projectSshKeys,
  projects,
  sshKeys,
} from "@repo/db";
import { AppError } from "../../lib/appError.js";
import { getConfigReadyGithubRepos } from "../../github-app-functions/get-project-ready-github-repos.js";

export const getRuntimeSessionConfig = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);

    const [sessionRow] = await db
      .select({
        project_session: projectSessions,
        project: projects,
      })
      .from(projectSessions)
      .leftJoin(projects, eq(projects.id, projectSessions.project_id))
      .where(eq(projectSessions.id, id));

    if (!sessionRow?.project_session || !sessionRow?.project)
      throw new AppError("Project session not found", 404);

    const { project } = sessionRow;

    const [tasks, repos, keys] = await Promise.all([
      db
        .select()
        .from(projectSessionTasks)
        .where(eq(projectSessionTasks.project_session_id, id)),

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
      tasks: tasks.map((t) => ({
        folder_name: t.folder_name,
        task: t.task,
      })),
    };

    res.status(200).json({ data: { config } });
  },
);
