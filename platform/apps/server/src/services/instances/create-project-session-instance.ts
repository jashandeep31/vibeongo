import {
  and,
  db,
  eq,
  githubRepos,
  inArray,
  projectGithubRepos,
  projectDomainRouting,
  projects,
  projectSessions,
  projectSessionsCategory,
  projectSessionTasks,
  projectSshKeys,
  sshKeys,
  userSettings,
} from "@repo/db";
import { createInstanceSchema } from "@repo/shared";
import * as crypto from "node:crypto";
import { AppError } from "../../lib/app-error.js";
import { invalidateProjectProxiesByPid } from "../../lib/invalidate-project-proxies-by-pid.js";
import { spinUpAndSaveInstance } from "./spin-up-and-save-instance.js";
import type { InstanceAutoTerminateSetting } from "./get-user-instance-auto-terminate-minutes.js";
import type { InstanceRuntime } from "../../providers/types.js";

type CreateInstanceInput = ReturnType<typeof createInstanceSchema.parse>;

export const createProjectSessionInstance = async ({
  userId,
  input,
  runtime = "ec2",
  sessionCategory = "manual",
  terminate = false,
  terminateSetting = "manual",
  assign_domains = false,
}: {
  userId: string;
  input: CreateInstanceInput;
  runtime?: InstanceRuntime;
  sessionCategory?: (typeof projectSessionsCategory.enumValues)[number];
  terminate?: boolean;
  terminateSetting?: InstanceAutoTerminateSetting;
  assign_domains?: boolean;
}) => {
  const rows = await db
    .select({
      project: projects,
      sshKey: sshKeys,
    })
    .from(projects)
    .leftJoin(projectSshKeys, eq(projectSshKeys.project_id, projects.id))
    .leftJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id))
    .where(and(eq(projects.user_id, userId), eq(projects.id, input.projectId)));

  const project = rows[0]?.project;
  if (!project) throw new AppError("Project not found", 404);

  const sshKeysArray = rows
    .map((row) => row.sshKey?.value)
    .filter((key): key is string => Boolean(key));

  let defaultModel = "";
  if (input.tasks.some((task) => !task.model)) {
    const [settings] = await db
      .select({ defaultModel: userSettings.default_model })
      .from(userSettings)
      .where(eq(userSettings.user_id, userId));

    defaultModel = settings?.defaultModel?.trim() ?? "";
  }

  const projectSession = await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(projectSessions)
      .values({
        name: input.sessionName,
        description: input.sessionDescription || "",
        user_id: userId,
        project_id: project.id,
        category: sessionCategory,
      })
      .returning();

    if (!session) {
      throw new AppError("Failed to create a project session", 500);
    }

    if (input.tasks.length > 0) {
      const repoIds = [...new Set(input.tasks.map((task) => task.repoId))];
      const requestedRepos = await tx
        .select({ repo: githubRepos })
        .from(projectGithubRepos)
        .innerJoin(
          githubRepos,
          eq(githubRepos.id, projectGithubRepos.github_repo_id),
        )
        .where(
          and(
            eq(projectGithubRepos.project_id, project.id),
            eq(githubRepos.user_id, userId),
            inArray(githubRepos.id, repoIds),
          ),
        );

      const reposById = new Map(
        requestedRepos.map(({ repo }) => [repo.id, repo]),
      );
      if (reposById.size !== repoIds.length) {
        throw new AppError(
          "One or more repositories are not attached to this project",
          400,
        );
      }

      await tx.insert(projectSessionTasks).values(
        input.tasks.map((task, index) => {
          const repo = reposById.get(task.repoId);
          if (!repo) throw new AppError("Repository not found", 404);

          return {
            project_session_id: session.id,
            order_number: index,
            task: task.task,
            model: task.model || defaultModel,
            folder_name: repo.full_name.split("/").at(-1),
            agent: task.agent,
          };
        }),
      );
    }

    return session;
  });

  const instance = await spinUpAndSaveInstance({
    sshKeys: sshKeysArray,
    project,
    userId,
    sessionId: projectSession.id,
    instanceId: crypto.randomUUID(),
    runtime,
    terminate,
    terminateSetting,
  });

  if (!instance) throw new AppError("Failed to spin up the instance", 500);

  if (assign_domains) {
    await db
      .update(projectDomainRouting)
      .set({ target_instance_id: instance.id })
      .where(eq(projectDomainRouting.project_id, project.id));

    await invalidateProjectProxiesByPid(project.id);
  }

  return {
    projectSession,
    instance,
  };
};
