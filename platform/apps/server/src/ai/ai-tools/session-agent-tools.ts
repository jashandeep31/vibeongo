import {
  and,
  db,
  eq,
  githubRepos,
  instanceRuntimeKind,
  projectGithubRepos,
  projects,
} from "@repo/db";
import { createInstanceSchema } from "@repo/shared";
import { tool, Tool } from "ai";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { createProjectSessionInstance } from "../../services/instances/create-project-session-instance.js";
import sandbox from "bullmq/dist/esm/classes/sandbox.js";

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
              overview: p.repo.overview,
            }),
          );
        }
      }
      return repos;
    },
  });

const createProjectSessionInstanceAIToolSchema = createInstanceSchema
  .omit({
    projectId: true,
  })
  .extend({
    sandbox: z.enum(instanceRuntimeKind.enumValues).default("sandbox"),
  });

export const createProjectSessionInstanceAITool = (
  userId: string,
  projectId: string,
): Tool =>
  tool({
    description:
      "Create a project session with its ordered tasks and start the project's VPS. This is a paid, state-changing action. Call it exactly once and only after the user explicitly confirms the proposed tasks.",
    inputSchema: createProjectSessionInstanceAIToolSchema,
    execute: async (rawData: unknown) => {
      try {
        const toolInput =
          createProjectSessionInstanceAIToolSchema.parse(rawData);
        const input = createInstanceSchema.parse({
          ...toolInput,
          projectId,
        });
        const { projectSession, instance } = await createProjectSessionInstance(
          { userId, input, terminate: true, runtime: toolInput.sandbox },
        );

        return {
          success: true,
          sessionId: projectSession.id,
          instanceId: instance.id,
          message: "Project session created and instance started successfully.",
        };
      } catch (error) {
        if (error instanceof AppError) {
          return { success: false, error: error.message };
        }

        console.error("Failed to create project session from AI tool", error);
        return {
          success: false,
          error: "Could not create the project session. Please try again.",
        };
      }
    },
  });
