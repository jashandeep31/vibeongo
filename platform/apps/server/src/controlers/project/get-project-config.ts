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
import { getGithubRepoReadonlyToken } from "../../github-app-functions/get-github-repo-readonly-token.js";

export const getProjectConfigById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 400);

    const id = req.params.id;
    if (!id || typeof id !== "string") throw new AppError("Invalid id ", 400);

    const rows = await db
      .select({
        project: projects,
        github_repos: githubRepos,
        ssh_keys: sshKeys,
      })
      .from(projects)
      .leftJoin(
        projectGithubRepos,
        eq(projectGithubRepos.project_id, projects.id),
      )
      .leftJoin(
        githubRepos,
        eq(githubRepos.id, projectGithubRepos.github_repo_id),
      )
      .leftJoin(projectSshKeys, eq(projectSshKeys.id, projects.id))
      .leftJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id))
      .where(and(eq(projects.id, id), eq(projects.user_id, user.id)));

    const project = rows[0]?.project;
    if (!project) throw new AppError("Project not found", 404);

    const github_repos: (typeof githubRepos.$inferSelect)[] = rows
      .map((row) => row.github_repos)
      .filter((r): r is typeof githubRepos.$inferSelect => r !== null);

    const ssh_keys: string[] = rows
      .map((row) => row.ssh_keys?.value ?? "")
      .filter((ssh_key) => ssh_key);

    console.log(github_repos);
    const config = {
      repos: await getProjectReadyGithubRepos(github_repos),
      ssh_keys: ssh_keys,
      ...(project.config as any),
    };

    res.status(200).json({ data: config });
  },
);

type ProjectReadyGithubRepo = {
  clone_url: string;
  repo_url: string;
  auth_token: string | null;
  public: boolean;
};
const getProjectReadyGithubRepos = async (
  repos: (typeof githubRepos.$inferSelect)[],
): Promise<ProjectReadyGithubRepo[]> => {
  const response: ProjectReadyGithubRepo[] = [];

  for (const repo of repos) {
    let auth_token = null;
    if (!repo.public) {
      // NOTE: batch request can be used to get the readonly token
      // We aren't using it because due to not having clearity on the on which direction our project is going :(
      const token = await getGithubRepoReadonlyToken(
        repo.full_name.split("/").pop()!,
        repo.installation_id,
      );

      if (token) {
        auth_token = token;
      }
    }
    response.push({
      clone_url: `https://github.com/${repo.full_name}.git`,
      repo_url: `https://github.com/${repo.full_name}`,
      auth_token,
      public: repo.public || false,
    });
  }
  return response;
};
