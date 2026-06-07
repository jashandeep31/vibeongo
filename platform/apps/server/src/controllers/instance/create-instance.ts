import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import {
  and,
  db,
  eq,
  githubRepos,
  inArray,
  projectDomainRouting,
  projectGithubRepos,
  projects,
  projectSessions,
  projectSessionTasks,
  projectSshKeys,
  sshKeys,
} from "@repo/db";
import { setupInstanceScript } from "../../scripts/setup-instance-script.js";
import { spinUpAndSaveInstance } from "../../services/instances/spin-up-and-save-instance.js";
import { createSessionAuthToken } from "../../lib/create-session-auth-token.js";
import { createInstanceSchema } from "@repo/shared";
import { invalidateProjectProxiesByPid } from "../../lib/invalidate-project-proxies-by-pid.js";

export const createInstance = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const body = createInstanceSchema.parse(req.body);

    // getting project
    const rows = await db
      .select({
        project: projects,
        sshKey: sshKeys,
      })
      .from(projects)
      .leftJoin(projectSshKeys, eq(projectSshKeys.project_id, projects.id))
      .leftJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id))
      .where(
        and(eq(projects.user_id, user.id), eq(projects.id, body.projectId)),
      );

    const project = rows[0]?.project;

    const sshKeysArray = rows
      .map((row) => row.sshKey!.value)
      .filter((key) => key !== null);

    if (!project) throw new AppError("Project not found", 404);

    // creating a project session
    const projectSession = await db.transaction(async (tx) => {
      const [projectSession] = await tx
        .insert(projectSessions)
        .values({
          name: body.sessionName,
          description: body.sessionDescription || "",
          user_id: user.id,
          project_id: project.id,
        })
        .returning();
      if (!projectSession)
        throw new AppError("Failed to create a project session", 500);

      if (body.tasks.length > 0) {
        const repoIds = [...new Set(body.tasks.map((task) => task.repoId))];
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
              eq(githubRepos.user_id, user.id),
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
          body.tasks.map((task) => {
            const githubRepo = reposById.get(task.repoId);
            if (!githubRepo) {
              throw new AppError("Repository not found", 404);
            }

            return {
              project_session_id: projectSession.id,
              task: task.task,
              model: task.model || "",
              folder_name: githubRepo.full_name.split("/").at(-1),
              agent: task.agent,
            };
          }),
        );
      }
      return projectSession;
    });

    if (!projectSession)
      throw new AppError("Failed to create a project session", 500);

    const authToken = await createSessionAuthToken(projectSession.id);
    const instanceId = crypto.randomUUID();
    const setupScript = setupInstanceScript({
      sshKey: sshKeysArray.join("\n"),
      authToken: authToken,
      projectSessionId: projectSession.id,
      instanceId,
    });

    const instance = await spinUpAndSaveInstance({
      setupScript,
      project,
      userId: user.id,
      sessionId: projectSession.id,
      instanceId,
    });
    if (!instance) throw new AppError("Failed to spin up the instance", 500);
    // setting up the instance id  as default for the project routing
    await db
      .update(projectDomainRouting)
      .set({
        target_instance_id: instance.id,
      })
      .where(eq(projectDomainRouting.project_id, project.id));

    // TODO: fix the hadnling of the removing and creation if no prev instance is their or prev ones have assinged as deafults then user need to change manually
    // removing all hte prev domain if they are their as the new instance need those
    await invalidateProjectProxiesByPid(project.id);

    res.status(201).json({
      message: "Successfully had created the project intance",
    });
  },
);
