import {
  and,
  db,
  eq,
  isNull,
  projectAutomationTriggers,
  projectAutomations,
} from "@repo/db";
import { z } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";

export const deleteProjectAutomationTrigger = catchAsync(async (req, res) => {
  const user = req.user;
  if (!user) throw new AppError("User not found", 401);

  const { id: projectAutomationId, triggerId } = z
    .object({ id: z.uuid(), triggerId: z.uuid() })
    .parse(req.params);

  const result = await db.transaction(async (tx) => {
    const [trigger] = await tx
      .select({
        id: projectAutomationTriggers.id,
        deleted_at: projectAutomationTriggers.deleted_at,
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
          eq(projectAutomationTriggers.id, triggerId),
          eq(
            projectAutomationTriggers.project_automation_id,
            projectAutomationId,
          ),
          eq(projectAutomations.user_id, user.id),
          isNull(projectAutomations.deleted_at),
        ),
      )
      .limit(1);

    if (!trigger) {
      throw new AppError("Project automation trigger not found", 404);
    }

    if (trigger.deleted_at) return { alreadyDeleted: true };

    await tx
      .update(projectAutomationTriggers)
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where(
        and(
          eq(projectAutomationTriggers.id, trigger.id),
          isNull(projectAutomationTriggers.deleted_at),
        ),
      );

    return { alreadyDeleted: false };
  });

  res.status(200).json({
    message: result.alreadyDeleted
      ? "Project automation trigger was already deleted"
      : "Project automation trigger deleted successfully",
  });
});
