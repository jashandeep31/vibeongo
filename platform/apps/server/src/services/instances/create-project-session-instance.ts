import {
  and,
  db,
  eq,
  gitRepos,
  inArray,
  projectGitRepos,
  projects,
  projectSessions,
  projectSessionsCategory,
  projectSessionTasks,
  userSettings,
} from "@repo/db";
import { createInstanceSchema } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";
import type { InstanceAutoTerminateSetting } from "./get-user-instance-auto-terminate-minutes.js";
import type { InstanceRuntime } from "../../providers/types.js";
import { scheduleAutomatedInstanceLaunch } from "./check-and-queue-instance-launch.js";

type CreateInstanceInput = ReturnType<typeof createInstanceSchema.parse>;

export const createProjectSessionInstance = async ({
  userId,
  input,
  runtime = "vm",
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
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.user_id, userId), eq(projects.id, input.projectId)));

  if (!project) throw new AppError("Project not found", 404);

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
        .select({ repo: gitRepos })
        .from(projectGitRepos)
        .innerJoin(gitRepos, eq(gitRepos.id, projectGitRepos.github_repo_id))
        .where(
          and(
            eq(projectGitRepos.project_id, project.id),
            eq(gitRepos.user_id, userId),
            inArray(gitRepos.id, repoIds),
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

  await scheduleAutomatedInstanceLaunch({
    userId: project.user_id,
    sessionId: projectSession.id,
    spinedUpBy: terminateSetting,
    runtime: runtime,
    category: sessionCategory,
  });
  return {
    projectSession,
  };
};
