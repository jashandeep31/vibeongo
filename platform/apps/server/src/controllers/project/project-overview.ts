import {
  and,
  db,
  desc,
  eq,
  inArray,
  instances,
  projectSessions,
  projects,
} from "@repo/db";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";

const overviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export const getProjectOverview = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const { page, limit } = overviewQuerySchema.parse(req.query);
    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        created_at: projects.created_at,
      })
      .from(projects)
      .where(and(eq(projects.user_id, user.id), eq(projects.deleted, false)))
      .orderBy(desc(projects.created_at), desc(projects.id))
      .limit(limit + 1)
      .offset((page - 1) * limit);

    const hasNext = projectRows.length > limit;
    const pageProjects = projectRows.slice(0, limit);
    if (pageProjects.length === 0) {
      res.status(200).json({ data: [], page, limit, hasNext });
      return;
    }

    const sessionRows = await db
      .select({
        id: projectSessions.id,
        project_id: projectSessions.project_id,
        name: projectSessions.name,
        description: projectSessions.description,
        category: projectSessions.category,
        started_at: projectSessions.started_at,
        created_at: projectSessions.created_at,
      })
      .from(projectSessions)
      .where(
        and(
          eq(projectSessions.user_id, user.id),
          eq(projectSessions.archived, false),
          inArray(
            projectSessions.project_id,
            pageProjects.map((project) => project.id),
          ),
        ),
      )
      .orderBy(desc(projectSessions.created_at), desc(projectSessions.id));

    const instanceRows =
      sessionRows.length === 0
        ? []
        : await db
            .select({
              id: instances.id,
              project_id: instances.project_id,
              project_session_id: instances.project_session_id,
              name: instances.name,
              state: instances.state,
              runtime_kind: instances.runtime_kind,
              started_at: instances.started_at,
              terminates_at: instances.terminates_at,
            })
            .from(instances)
            .where(
              and(
                eq(instances.user_id, user.id),
                eq(instances.state, "running"),
                inArray(
                  instances.project_session_id,
                  sessionRows.map((session) => session.id),
                ),
              ),
            )
            .orderBy(desc(instances.started_at), desc(instances.id));

    const instancesBySession = new Map<string, typeof instanceRows>();
    for (const instance of instanceRows) {
      if (!instance.project_session_id) continue;
      const group = instancesBySession.get(instance.project_session_id) ?? [];
      group.push(instance);
      instancesBySession.set(instance.project_session_id, group);
    }

    const sessionsByProject = new Map<string, typeof sessionRows>();
    for (const session of sessionRows) {
      const group = sessionsByProject.get(session.project_id) ?? [];
      group.push(session);
      sessionsByProject.set(session.project_id, group);
    }

    const data = pageProjects.map((project) => ({
      ...project,
      sessions: (sessionsByProject.get(project.id) ?? []).map((session) => ({
        ...session,
        instances: instancesBySession.get(session.id) ?? [],
      })),
    }));

    res.status(200).json({ data, page, limit, hasNext });
  },
);
