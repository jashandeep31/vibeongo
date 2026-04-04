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
import { getGithubRepoReadonlyToken } from "../../github-app-functions/get-github-repo-readonly-token.js";

export const getProjectSessionConfig = catchAsync(
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

    const { project_session, project } = sessionRow;

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
      repos: await getProjectReadyGithubRepos(validRepos),
      ssh_keys: keys.map((k) => k.value).filter((v): v is string => !!v),
      tasks: tasks.map((t) => ({
        folder_name: t.folder_name,
        task: t.task,
      })),
    };

    res.status(200).json({ data: { config } });
  },
);

type ProjectReadyGithubRepo = {
  full_name: string;
  access_token: string | null;
  public: boolean;
  folder_name: string;
  setup_script: string;
};

const getProjectReadyGithubRepos = async (
  repos: (typeof githubRepos.$inferSelect)[],
): Promise<ProjectReadyGithubRepo[]> => {
  return Promise.all(
    repos.map(async (repo) => {
      const folder_name = repo.full_name.split("/").pop()!;
      const access_token = repo.public
        ? null
        : ((await getGithubRepoReadonlyToken(
            folder_name,
            repo.installation_id,
          )) ?? null);

      return {
        full_name: repo.full_name,
        access_token,
        public: repo.public ?? false,
        folder_name,
        setup_script: repo.setup_script,
      };
    }),
  );
};
