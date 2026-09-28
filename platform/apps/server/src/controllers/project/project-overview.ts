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
  limit: z.coerce.number().int().min(1).max(100).default(15),
});

type Session = typeof projectSessions.$inferSelect;
type Instance = typeof instances.$inferSelect;

export const getProjectOverview = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const { page, limit } = overviewQuerySchema.parse(req.query);
    const activeProjects = and(
      eq(projects.user_id, user.id),
      eq(projects.deleted, false),
    );

    const projectsQuery = db
      .select()
      .from(projects)
      .where(activeProjects)
      .orderBy(desc(projects.created_at), desc(projects.id))
      .limit(limit + 1)
      .offset((page - 1) * limit);

    // Sessions and instances are scoped by the same project page as a
    // subquery, so all three queries run in parallel.
    const projectIdsQuery = db
      .select({ id: projects.id })
      .from(projects)
      .where(activeProjects)
      .orderBy(desc(projects.created_at), desc(projects.id))
      .limit(limit)
      .offset((page - 1) * limit);

    const [projectRows, sessionRows, instanceRows] = await Promise.all([
      projectsQuery,
      db
        .select()
        .from(projectSessions)
        .where(
          and(
            eq(projectSessions.user_id, user.id),
            eq(projectSessions.archived, false),
            inArray(projectSessions.project_id, projectIdsQuery),
          ),
        )
        .orderBy(desc(projectSessions.created_at), desc(projectSessions.id)),
      db
        .select()
        .from(instances)
        .where(
          and(
            eq(instances.user_id, user.id),
            eq(instances.state, "running"),
            inArray(instances.project_id, projectIdsQuery),
          ),
        )
        .orderBy(desc(instances.started_at), desc(instances.id)),
    ]);

    const hasNext = projectRows.length > limit;
    const pageProjects = projectRows.slice(0, limit);

    const instancesBySession = new Map<string, Instance[]>();
    for (const instance of instanceRows) {
      if (!instance.project_session_id) continue;
      const group = instancesBySession.get(instance.project_session_id) ?? [];
      group.push(instance);
      instancesBySession.set(instance.project_session_id, group);
    }

    const sessionsByProject = new Map<string, Session[]>();
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
