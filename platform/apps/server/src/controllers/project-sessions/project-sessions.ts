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
  customQuery,
  projectSessionTasks,
} from "@repo/db";
import { spinUpAndSaveInstance } from "../../services/instances/spin-up-and-save-instance.js";
import { createSessionAuthToken } from "../../lib/create-session-auth-token.js";
import { z } from "zod";
import { setupInstanceScript } from "../../scripts/setup-instance-script.js";
import { commonFilterSchema } from "@repo/shared";
import { invalidateProjectProxiesByPid } from "../../lib/invalidate-project-proxies-by-pid.js";
import { appendFile } from "node:fs";

export const getUserProjectSessions = catchAsync(
  async (req: Request, res: Response) => {
    const filters = commonFilterSchema
      .extend({
        projectId: z.string().optional(),
      })
      .parse(req.query);

    const user = req.user;
    if (!user) throw new AppError("User not found", 404);

    const where = [eq(projectSessions.user_id, user.id)];
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

// TODO: Either delete the project session or for the safer side
// instead of deleting the projectseesion just hide them
export const deleteProjectSessionById = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication failed", 401);

    const { id } = z
      .object({
        id: z.string(),
      })
      .parse(req.params);

    await db
      .select()
      .from(projectSessions)
      .where(
        and(eq(projectSessions.id, id), eq(projectSessions.user_id, user.id)),
      );
    res.status(200).json({});
  },
);
