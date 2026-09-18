import {
  and,
  db,
  desc,
  eq,
  inArray,
  instances,
  projectAutomationRuns,
  projectAutomations,
  projectSessions,
} from "@repo/db";
import { commonFilterSchema, z } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";

export const getProjectAutomationRuns = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found", 401);

  const { id } = z.object({ id: z.uuid() }).parse(req.params);
  const { page, limit } = commonFilterSchema.parse(req.query);

  const rows = await db
    .select({
      run: projectAutomationRuns,
      project_session: projectSessions,
    })
    .from(projectAutomationRuns)
    .innerJoin(
      projectAutomations,
      eq(projectAutomations.id, projectAutomationRuns.project_automation_id),
    )
    .leftJoin(
      projectSessions,
      eq(projectSessions.id, projectAutomationRuns.project_session_id),
    )
    .where(
      and(
        eq(projectAutomations.id, id),
        eq(projectAutomations.user_id, user.id),
      ),
    )
    .orderBy(desc(projectAutomationRuns.created_at))
    .limit(limit + 1)
    .offset((page - 1) * limit);

  const sessionIds = rows
    .map(({ project_session }) => project_session?.id)
    .filter((sessionId): sessionId is string => Boolean(sessionId));
  const instanceRows = sessionIds.length
    ? await db
        .select()
        .from(instances)
        .where(inArray(instances.project_session_id, sessionIds))
        .orderBy(desc(instances.created_at))
    : [];
  const latestInstanceBySession = new Map<
    string,
    typeof instances.$inferSelect
  >();

  for (const instance of instanceRows) {
    if (
      instance.project_session_id &&
      !latestInstanceBySession.has(instance.project_session_id)
    ) {
      latestInstanceBySession.set(instance.project_session_id, instance);
    }
  }

  res.status(200).json({
    data: {
      runs: rows.slice(0, limit).map(({ run, project_session }) => ({
        ...run,
        project_session: project_session
          ? {
              ...project_session,
              instance: latestInstanceBySession.get(project_session.id) ?? null,
            }
          : null,
      })),
      has_next: rows.length > limit,
      page,
    },
  });
});

export const rateProjectAutomationRun = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found", 401);

  const { id, runId } = z
    .object({ id: z.uuid(), runId: z.uuid() })
    .parse(req.params);
  const { rating, feedback } = z
    .object({
      rating: z.number().int().min(1).max(5),
      feedback: z.string().trim().max(1000).optional(),
    })
    .parse(req.body);

  const [ownedRun] = await db
    .select({ id: projectAutomationRuns.id })
    .from(projectAutomationRuns)
    .innerJoin(
      projectAutomations,
      eq(projectAutomations.id, projectAutomationRuns.project_automation_id),
    )
    .where(
      and(
        eq(projectAutomationRuns.id, runId),
        eq(projectAutomations.id, id),
        eq(projectAutomations.user_id, user.id),
      ),
    )
    .limit(1);

  if (!ownedRun) throw new AppError("Automation run not found", 404);

  const [updatedRun] = await db
    .update(projectAutomationRuns)
    .set({
      user_rating: rating,
      user_feedback: feedback || null,
      updated_at: new Date(),
    })
    .where(eq(projectAutomationRuns.id, ownedRun.id))
    .returning();

  if (!updatedRun) throw new AppError("Failed to rate automation run", 500);

  res.status(200).json({
    message: "Automation run rated successfully",
    data: updatedRun,
  });
});
