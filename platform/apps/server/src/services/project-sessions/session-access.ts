import { and, db, eq, projectSessions, projects } from "@repo/db";
import { AppError } from "../../lib/app-error.js";

export async function getOwnedSession(userId: string, sessionId: string) {
  const [row] = await db
    .select({ session: projectSessions, projectName: projects.name })
    .from(projectSessions)
    .innerJoin(projects, eq(projects.id, projectSessions.project_id))
    .where(
      and(
        eq(projectSessions.id, sessionId),
        eq(projectSessions.user_id, userId),
        eq(projects.user_id, userId),
        eq(projects.deleted, false),
      ),
    )
    .limit(1);
  if (!row) throw new AppError("Project session not found", 404);
  return row;
}

export async function getManualSession(userId: string, sessionId: string) {
  const row = await getOwnedSession(userId, sessionId);
  if (row.session.category !== "manual") {
    throw new AppError("Automated sessions cannot be managed manually", 409);
  }
  if (row.session.archived)
    throw new AppError(
      "Unarchive the session before managing its runtime",
      409,
    );
  return row;
}
