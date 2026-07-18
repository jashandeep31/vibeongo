import {
  and,
  db,
  eq,
  githubRepos,
  projectGithubRepos,
  projects,
} from "@repo/db";
import { tool, Tool } from "ai";
import { z } from "zod";

const getProjectGithubReposSchema = z.object({});
export const getProjectGithubRepos = (
  userId: string,
  projectId: string,
): Tool =>
  tool({
    description:
      "Get all github Repos of project to use the paths in hte tasks",
    inputSchema: getProjectGithubReposSchema,
    execute: async (rawData: unknown) => {
      const project = await db
        .select({ repo: githubRepos })
        .from(projects)
        .leftJoin(
          projectGithubRepos,
          eq(projectGithubRepos.project_id, projects.id),
        )
        .leftJoin(
          githubRepos,
          eq(githubRepos.id, projectGithubRepos.github_repo_id),
        )
        .where(and(eq(projects.user_id, userId), eq(projects.id, projectId)));

      if (!project || project.length === 0)
        return {
          error: "Project not found or doesn't belong to you",
        };

      const repos: string[] = [];
      for (const p of project) {
        if (p.repo) {
          repos.push(
            JSON.stringify({
              id: p.repo.id,
              full_name: p.repo.full_name,
              setup_script: p.repo.setup_script,
            }),
          );
        }
      }
      return repos;
    },
  });
