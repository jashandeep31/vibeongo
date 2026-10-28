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

type Session = typeof projectSessions.$inferSelect;
type Instance = typeof instances.$inferSelect;

export async function getProjectOverviewForUser(
  userId: string,
  { page, limit }: { page: number; limit: number },
) {
  const activeProjects = and(
    eq(projects.user_id, userId),
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
          eq(projectSessions.user_id, userId),
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
          eq(instances.user_id, userId),
          inArray(instances.state, ["running", "suspended"]),
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
  return { data, page, limit, hasNext };
}
