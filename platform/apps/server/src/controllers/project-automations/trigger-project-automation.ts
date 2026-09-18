import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "@repo/shared";
import {
  and,
  db,
  eq,
  projectAutomations,
  projectAutomationRuns,
  projectAutomationTasks,
  projectSessions,
  projectSessionTasks,
} from "@repo/db";
import { scheduleAutomatedInstanceLaunch } from "../../services/instances/check-and-queue-instance-launch.js";

export const triggerProjectAutomationManually = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) throw new AppError("User not found", 401);

    const { id } = z
      .object({
        id: z.uuid(),
      })
      .parse(req.params);

    const projectAutomationWithTasks = await db
      .select()
      .from(projectAutomations)
      .leftJoin(
        projectAutomationTasks,
        eq(projectAutomationTasks.project_automation_id, projectAutomations.id),
      )
      .where(
        and(
          eq(projectAutomations.id, id),
          eq(projectAutomations.user_id, user.id),
        ),
      );

    const tasks: (typeof projectAutomationTasks.$inferSelect)[] = [];

    for (const item of projectAutomationWithTasks) {
      if (item.project_automation_tasks) {
        tasks.push(item.project_automation_tasks);
      }
    }

    const projectAutomation =
      projectAutomationWithTasks[0]?.project_automations;
    if (!projectAutomation)
      throw new AppError("Project automation not found", 404);

    const triggeredAt = new Date();
    const readableTriggeredAt = triggeredAt.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });

    const automatedProjectSession = await db.transaction(async (tx) => {
      const [projectSession] = await tx
        .insert(projectSessions)
        .values({
          project_id: projectAutomation.project_id,
          name: `${projectAutomation.name} — Manual run (${readableTriggeredAt} UTC)`,
          description: `This session was created by manually triggering the “${projectAutomation.name}” automation. The run started on ${readableTriggeredAt} UTC and includes the tasks configured for that automation.`,
          started_at: triggeredAt,
          user_id: user.id,
          overview: "",
          category: "auto",
        })
        .returning();

      if (!projectSession) throw new AppError("Project session not found", 404);

      await tx.insert(projectSessionTasks).values(
        tasks.map((t) => {
          return {
            project_session_id: projectSession.id,
            folder_name: t.path_from_code,
            task: t.task_prompt,
            agent: t.agent,
            order_number: t.order_number,
            model: t.model,
          };
        }),
      );

      await tx.insert(projectAutomationRuns).values({
        project_automation_id: projectAutomation.id,
        project_session_id: projectSession.id,
      });

      await tx
        .update(projectAutomations)
        .set({ last_run_at: new Date(), updated_at: new Date() })
        .where(eq(projectAutomations.id, projectAutomation.id));

      return projectSession;
    });

    await scheduleAutomatedInstanceLaunch({
      userId: user.id,
      sessionId: automatedProjectSession.id,
      spinedUpBy: "issue",
      runtime: "sandbox",
      category: "auto",
    });

    res.status(200).json({ message: "Project automation triggered" });
  },
);
