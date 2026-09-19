import {
  and,
  db,
  desc,
  eq,
  isNull,
  projectAutomationTriggers,
  projectAutomations,
} from "@repo/db";
import { z } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { env } from "../../lib/env.js";

export const getProjectAutomationTriggers = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found", 401);

  const { id } = z.object({ id: z.uuid() }).parse(req.params);

  const triggers = await db
    .select({
      id: projectAutomationTriggers.id,
      name: projectAutomationTriggers.name,
      provider: projectAutomationTriggers.provider,
      project_automation_id: projectAutomationTriggers.project_automation_id,
      lasted_triggered_at: projectAutomationTriggers.lasted_triggered_at,
      created_at: projectAutomationTriggers.created_at,
      updated_at: projectAutomationTriggers.updated_at,
    })
    .from(projectAutomationTriggers)
    .innerJoin(
      projectAutomations,
      eq(
        projectAutomations.id,
        projectAutomationTriggers.project_automation_id,
      ),
    )
    .where(
      and(
        eq(projectAutomations.id, id),
        eq(projectAutomations.user_id, user.id),
        isNull(projectAutomations.deleted_at),
        isNull(projectAutomationTriggers.deleted_at),
      ),
    )
    .orderBy(desc(projectAutomationTriggers.created_at));

  const backendUrl = env.BACKEND_URL.replace(/\/+$/, "");

  res.status(200).json({
    data: {
      triggers: triggers.map((trigger) => ({
        ...trigger,
        webhook_url: `${backendUrl}/v1/webhook/project-automation/${trigger.id}`,
      })),
    },
  });
});
