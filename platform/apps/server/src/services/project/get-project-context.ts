import { and, db, eq, projects } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { getProjectWorkspaceRepositories } from "./get-project-workspace-repositories.js";

export async function getProjectContextForUser(
  userId: string,
  projectId: string,
) {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      overview: projects.overview,
    })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.user_id, userId),
        eq(projects.deleted, false),
      ),
    )
    .limit(1);

  if (!project) throw new AppError("Project not found", 404);

  const repositories = await getProjectWorkspaceRepositories(
    userId,
    [projectId],
    { includeOverview: true },
  );
  return { project, repositories };
}
