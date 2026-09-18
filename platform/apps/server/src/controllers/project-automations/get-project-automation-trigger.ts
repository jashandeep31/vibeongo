import {
  and,
  db,
  desc,
  eq,
  isNull,
  projectAutomationTriggerRuns,
  projectAutomationTriggers,
  projectAutomations,
} from "@repo/db";
import { commonFilterSchema, z } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { env } from "../../lib/env.js";

export const getProjectAutomationTrigger = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found", 401);

  const { id: projectAutomationId, triggerId } = z
    .object({ id: z.uuid(), triggerId: z.uuid() })
    .parse(req.params);
  const { page, limit } = commonFilterSchema.parse(req.query);

  const [trigger] = await db
    .select({
      id: projectAutomationTriggers.id,
      name: projectAutomationTriggers.name,
      project_automation_id: projectAutomationTriggers.project_automation_id,
      lasted_triggered_at: projectAutomationTriggers.lasted_triggered_at,
      created_at: projectAutomationTriggers.created_at,
      updated_at: projectAutomationTriggers.updated_at,
    })
    .from(projectAutomationTriggers)
    .innerJoin(
      projectAutomations,
      eq(projectAutomations.id, projectAutomationTriggers.project_automation_id),
    )
    .where(
      and(
        eq(projectAutomationTriggers.id, triggerId),
        eq(projectAutomationTriggers.project_automation_id, projectAutomationId),
        eq(projectAutomations.user_id, user.id),
        isNull(projectAutomations.deleted_at),
      ),
    )
    .limit(1);

  if (!trigger) throw new AppError("Project automation trigger not found", 404);

  const runRows = await db
    .select()
    .from(projectAutomationTriggerRuns)
    .where(eq(projectAutomationTriggerRuns.project_automation_trigger_id, trigger.id))
    .orderBy(desc(projectAutomationTriggerRuns.created_at))
    .limit(limit + 1)
    .offset((page - 1) * limit);

  const backendUrl = env.BACKEND_URL.replace(/\/+$/, "");

  res.status(200).json({
    data: {
      trigger: {
        ...trigger,
        webhook_url: `${backendUrl}/v1/webhook/project-automation/${trigger.id}`,
      },
      runs: runRows.slice(0, limit),
      has_next: runRows.length > limit,
      page,
    },
  });
});
