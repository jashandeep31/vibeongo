import { and, db, eq, projectSessions, projects, sql } from "@repo/db";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";

const MAX_ACTIVE_SESSIONS_PER_PROJECT = 8;

export const createManualSessionSchema = z.object({
  projectId: z.uuid("Project id must be valid"),
  sessionName: z
    .string()
    .trim()
    .min(4, "Session name must be at least 4 characters long")
    .max(50, "Session name must be at most 50 characters long"),
  sessionDescription: z.string().trim().optional(),
});

export async function createManualProjectSession(
  userId: string,
  input: z.infer<typeof createManualSessionSchema>,
) {
  const { projectId, sessionName, sessionDescription } =
    createManualSessionSchema.parse(input);
  const session = await db.transaction(async (tx) => {
    const [project] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.user_id, userId),
          eq(projects.deleted, false),
        ),
      )
      .for("update");

    if (!project) throw new AppError("Project not found", 404);

    const [result] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(projectSessions)
      .where(
        and(
          eq(projectSessions.project_id, project.id),
          eq(projectSessions.user_id, userId),
          eq(projectSessions.archived, false),
        ),
      );

    if ((result?.count ?? 0) >= MAX_ACTIVE_SESSIONS_PER_PROJECT) {
      throw new AppError(
        `You can have up to ${MAX_ACTIVE_SESSIONS_PER_PROJECT} active sessions in one project. Archive an existing session before creating another.`,
        409,
      );
    }

    const [createdSession] = await tx
      .insert(projectSessions)
      .values({
        name: sessionName,
        description: sessionDescription || "",
        user_id: userId,
        project_id: project.id,
        category: "manual",
      })
      .returning();

    return createdSession;
  });

  if (!session) throw new AppError("Failed to create project session", 500);
  return session;
}
