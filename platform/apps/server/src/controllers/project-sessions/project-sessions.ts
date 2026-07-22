import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import {
  and,
  desc,
  db,
  eq,
  instances,
  projectSessions,
  projects,
  projectSshKeys,
  sshKeys,
  projectDomainRouting,
  projectGithubRepos,
  customQuery,
  projectSessionTasks,
  githubRepos,
  exists,
  sql,
  asc,
  instanceRuntimeKind,
} from "@repo/db";
import { spinUpAndSaveInstance } from "../../services/instances/spin-up-and-save-instance.js";
import { z } from "zod";
import {
  commonFilterSchema,
  projectSessionTaskSchema,
  updateProjectSessionTaskSchema,
} from "@repo/shared";
import { invalidateProjectProxiesByPid } from "../../lib/invalidate-project-proxies-by-pid.js";

export const deleteProjectSessionTask = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);

    const { id, taskId } = z
      .object({
        id: z.uuid(),
        taskId: z.uuid(),
      })
      .parse(req.params);

    const [deleted] = await db
      .delete(projectSessionTasks)
      .where(
        and(
          eq(projectSessionTasks.id, taskId),
          eq(projectSessionTasks.project_session_id, id),
          exists(
            db
              .select({ _: sql`1` })
              .from(projectSessions)
              .where(
                and(
                  eq(projectSessions.id, id),
                  eq(projectSessions.user_id, user.id),
                ),
              ),
          ),
        ),
      )
      .returning({ id: projectSessionTasks.id });

    if (!deleted) {
      throw new AppError("Task or project session not found", 404);
    }

    res.status(200).json({ message: "Successfully deleted the task" });
  },
);

export const updateProjectSessionTask = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);

    const { id, taskId } = z
      .object({
        id: z.uuid(),
        taskId: z.uuid(),
      })
      .parse(req.params);

    const { task, model, agent, done, repoId } =
      updateProjectSessionTaskSchema.parse(req.body);

    const [repo] = await db
      .select({ repo: githubRepos })
      .from(projectSessions)
      .innerJoin(
        projectGithubRepos,
        eq(projectGithubRepos.project_id, projectSessions.project_id),
      )
      .innerJoin(
        githubRepos,
        eq(githubRepos.id, projectGithubRepos.github_repo_id),
      )
      .where(
        and(
          eq(projectSessions.id, id),
          eq(projectSessions.user_id, user.id),
          eq(githubRepos.id, repoId),
          eq(githubRepos.user_id, user.id),
        ),
      );
    if (!repo) {
      throw new AppError("Github repo is not attached to this project", 404);
    }

    const [updated] = await db
      .update(projectSessionTasks)
      .set({
        task,
        model,
        agent,
        done,
        folder_name: repo.repo.full_name.split("/").at(-1),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(projectSessionTasks.id, taskId),
          eq(projectSessionTasks.project_session_id, id),
          exists(
            db
              .select({ _: sql`1` })
              .from(projectSessions)
              .where(
                and(
                  eq(projectSessions.id, id),
                  eq(projectSessions.user_id, user.id),
                ),
              ),
          ),
        ),
      )
      .returning({ id: projectSessionTasks.id });

    if (!updated) {
      throw new AppError("Task or project session not found", 404);
    }

    res.status(200).json({ message: "Successfully updated the task" });
  },
);

export const addTaskToProjectSession = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);
    const { id } = z
      .object({
        id: z.uuid(),
      })
      .parse(req.params);

    const { task, model, agent, repoId } = projectSessionTaskSchema.parse(
      req.body,
    );

    const [session] = await db
      .select()
      .from(projectSessions)
      .where(
        and(eq(projectSessions.user_id, user.id), eq(projectSessions.id, id)),
      );
    if (!session) {
      throw new AppError("Project session not found", 404);
    }

    const [gitRepo] = await db
      .select({ repo: githubRepos })
      .from(projectGithubRepos)
      .innerJoin(
        githubRepos,
        eq(githubRepos.id, projectGithubRepos.github_repo_id),
      )
      .where(
        and(
          eq(projectGithubRepos.project_id, session.project_id),
          eq(githubRepos.user_id, user.id),
          eq(githubRepos.id, repoId),
        ),
      );

    if (!gitRepo) {
      throw new AppError("Github repo is not attached to this project", 404);
    }

    await db.insert(projectSessionTasks).values({
      task,
      model,
      agent,
      project_session_id: id,
      folder_name: gitRepo.repo.full_name.split("/").at(-1) ?? "",
      order_number: sql<number>`
    COALESCE(
      (
        SELECT MAX(order_number) + 1
        FROM project_session_tasks
        WHERE project_session_id = ${id}
      ),
      1
    )
  `,
    });

    res.status(200).json({ message: "Successfully added the task" });
  },
);
export const getUserProjectSessions = catchAsync(
  async (req: Request, res: Response) => {
    const filters = commonFilterSchema
      .extend({
        projectId: z.string().optional(),
        archived: z.string().transform((v) => v === "true"),
      })
      .parse(req.query);

    const user = req.user;
    if (!user) throw new AppError("User not found", 404);

    const where = [
      eq(projectSessions.user_id, user.id),
      eq(projectSessions.archived, filters.archived),
    ];
    if (filters.projectId) {
      where.push(eq(projectSessions.project_id, filters.projectId));
    }

    const query = customQuery(
      db
        .select({
          projectSession: projectSessions,
          instance: instances,
        })
        .from(projectSessions)
        .leftJoin(
          instances,
          and(
            eq(instances.project_session_id, projectSessions.id),
            eq(instances.state, "running"),
          ),
        )
        .where(and(...where))
        .orderBy(desc(projectSessions.created_at))
        .$dynamic(),
      filters.page,
      filters.limit,
    );
    const rows = await query;

    const sessions = new Map<
      string,
      typeof projectSessions.$inferSelect & {
        instances: (typeof instances.$inferSelect)[];
      }
    >();
    for (const row of rows) {
      const s = row.projectSession;
      if (!sessions.has(s.id)) {
        sessions.set(s.id, { ...s, instances: [] });
      }
      if (row.instance) {
        sessions.get(s.id)?.instances.push(row.instance);
      }
    }

    const sessionsWithExtra = Array.from(sessions.values());
    const refinedData = sessionsWithExtra.slice(0, filters.limit);

    res.status(200).json({
      data: refinedData,
      page: filters.page,
      hasNext: sessionsWithExtra.length > filters.limit,
    });
  },
);

export const resumeProjectSession = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 404);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { runtime } = z
      .object({
        runtime: z.enum(instanceRuntimeKind.enumValues).default("vm"),
      })
      .parse(req.body ?? {});

    const rows = await db
      .select({
        project: projects,
        project_session: projectSessions,
        ssh_keys: sshKeys.value,
      })
      .from(projectSessions)
      .innerJoin(projects, eq(projects.id, projectSessions.project_id))
      .leftJoin(projectSshKeys, eq(projectSshKeys.project_id, projects.id))
      .leftJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id))
      .where(
        and(eq(projectSessions.id, id), eq(projectSessions.user_id, user.id)),
      );
    const projectSession = rows[0]?.project_session;
    const project = rows[0]?.project;
    const sshKeysArray = [...rows.map((r) => r.ssh_keys)].filter(
      (key) => key !== null,
    );
    if (!project) throw new AppError("Project not found", 404);
    if (!projectSession) throw new AppError("Project session not found", 404);

    const instanceId = crypto.randomUUID();

    const instance = await spinUpAndSaveInstance({
      sshKeys: sshKeysArray,
      project,
      userId: user.id,
      sessionId: projectSession.id,
      instanceId,
      runtime,
    });

    if (!instance) throw new AppError("Failed to spin up the instance", 500);

    await db
      .update(projectDomainRouting)
      .set({
        target_instance_id: instance.id,
      })
      .where(eq(projectDomainRouting.project_id, project.id));

    await invalidateProjectProxiesByPid(project.id);

    res.status(200).json({ message: "Successfully resumed the instance" });
  },
);

export const getProjectSessionById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication failed", 401);

    const { id } = z
      .object({
        id: z.uuid(),
      })
      .parse({
        ...req.params,
      });

    const rows = await db
      .select()
      .from(projectSessions)
      .leftJoin(
        projectSessionTasks,
        eq(projectSessionTasks.project_session_id, id),
      )
      .orderBy(asc(projectSessionTasks.order_number))
      .leftJoin(
        instances,
        and(
          eq(instances.project_session_id, id),
          eq(instances.state, "running"),
        ),
      )
      .where(
        and(eq(projectSessions.user_id, user.id), eq(projectSessions.id, id)),
      );

    const session = rows[0]?.project_session;
    if (!session) throw new AppError("Project session not found", 404);

    const sessionWithTasks = {
      ...session,
      instances: rows.map((row) => row.instances).filter(Boolean),
      tasks: rows.map((row) => row.project_session_tasks).filter(Boolean),
    };

    res.status(200).json({ data: sessionWithTasks });
  },
);

export const archiveProjectSession = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication failed", 401);

    const { id } = z
      .object({
        id: z.string(),
      })
      .parse(req.params);

    const { action } = z
      .object({
        action: z
          .union([z.boolean(), z.string()])
          .transform((value) =>
            typeof value === "boolean" ? value : value === "true",
          ),
      })
      .parse(req.body);
    await db
      .update(projectSessions)
      .set({
        archived: action,
      })
      .where(
        and(eq(projectSessions.id, id), eq(projectSessions.user_id, user.id)),
      );

    res.status(200).json({
      message: "Successfully archived the project session",
    });
  },
);
