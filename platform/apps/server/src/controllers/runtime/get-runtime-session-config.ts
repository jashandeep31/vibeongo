import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { z } from "zod";
import {
  db,
  eq,
  asc,
  githubRepos,
  projectGithubRepos,
  projectSessions,
  projectSessionTasks,
  projectSshKeys,
  projects,
  sshKeys,
  sessionAuthTokens,
  instances,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { getConfigReadyGithubRepos } from "../../github-app-functions/get-project-ready-github-repos.js";
import { env } from "../../lib/env.js";
import { getDecryptedProjectConfig } from "../../services/project/project-config.js";

export const getRuntimeSessionConfig = catchAsync(
  async (req: Request, res: Response) => {
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

    const { project, instance } = sessionRow;
    const stringfiedConfig = await getDecryptedProjectConfig(project.id);
    const parsedConfig = JSON.parse(stringfiedConfig);

    const [tasks, repos, keys] = await Promise.all([
      db
        .select()
        .from(projectSessionTasks)
        .orderBy(asc(projectSessionTasks.created_at))
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

    const [token] = await db
      .select()
      .from(sessionAuthTokens)
      .where(eq(sessionAuthTokens.session_id, sessionRow.project_session.id))
      .orderBy(sessionAuthTokens.created_at);

    const config = {
      ...(parsedConfig as any),
      token: token?.token || "",
      serverBaseUrl: env.BACKEND_URL,
      sessionId: sessionRow.project_session.id,
      instanceConfig: instance.config,
      instanceId,
      projectId: project.id,
      initialScript: project.initial_script,
      finalScript: project.final_script,
      repos: await getConfigReadyGithubRepos(validRepos),
      ssh_keys: keys.map((k) => k.value).filter((v): v is string => !!v),
      tasks: tasks.map((t) => ({
        id: t.id,
        folder_name: t.folder_name,
        task: t.task,
        agent: t.agent,
        model: t.model,
        done: t.done,
      })),
    };

    res.status(200).json({ data: config });
  },
);
