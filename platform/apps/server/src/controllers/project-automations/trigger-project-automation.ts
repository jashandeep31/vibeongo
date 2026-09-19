import { randomBytes } from "node:crypto";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { env } from "../../lib/env.js";
import { hashToSHA256 } from "../../lib/sha256.js";
import { Request, Response } from "express";
import { z } from "@repo/shared";
import {
  and,
  db,
  eq,
  isNull,
  projectAutomations,
  projectAutomationRuns,
  projectAutomationTasks,
  projectAutomationTriggers,
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

    const { projectSession, automationRun } = await db.transaction(
      async (tx) => {
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

        if (!projectSession)
          throw new AppError("Project session not found", 404);

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

        const [automationRun] = await tx
          .insert(projectAutomationRuns)
          .values({
            project_automation_id: projectAutomation.id,
            project_session_id: projectSession.id,
            source: "manual",
            status: "allocating",
          })
          .returning({ id: projectAutomationRuns.id });

        if (!automationRun) {
          throw new AppError("Failed to create project automation run", 500);
        }

        await tx
          .update(projectAutomations)
          .set({ last_run_at: new Date(), updated_at: new Date() })
          .where(eq(projectAutomations.id, projectAutomation.id));

        return { projectSession, automationRun };
      },
    );

    try {
      await scheduleAutomatedInstanceLaunch({
        userId: user.id,
        sessionId: projectSession.id,
        spinedUpBy: "automation",
        runtime: "sandbox",
        category: "auto",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to queue automation";

      await db
        .update(projectAutomationRuns)
        .set({
          status: "failed",
          error: message.slice(0, 255),
          updated_at: new Date(),
        })
        .where(eq(projectAutomationRuns.id, automationRun.id));

      throw error;
    }

    res.status(200).json({
      message: "Project automation triggered",
      data: { automation_run_id: automationRun.id },
    });
  },
);

export const rotateProjectAutomationTriggerToken = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 401);

    const { id: projectAutomationId, triggerId } = z
      .object({ id: z.uuid(), triggerId: z.uuid() })
      .parse(req.params);

    const [trigger] = await db
      .select({
        id: projectAutomationTriggers.id,
        name: projectAutomationTriggers.name,
        project_automation_id: projectAutomationTriggers.project_automation_id,
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

    if (!trigger)
      throw new AppError("Project automation trigger not found", 404);

    const secret = `vgo_${randomBytes(32).toString("base64url")}`;
    const webhookSecret = await hashToSHA256(secret);

    const [updatedTrigger] = await db
      .update(projectAutomationTriggers)
      .set({ webhook_secret: webhookSecret, updated_at: new Date() })
      .where(eq(projectAutomationTriggers.id, trigger.id))
      .returning({
        id: projectAutomationTriggers.id,
        name: projectAutomationTriggers.name,
        project_automation_id: projectAutomationTriggers.project_automation_id,
        updated_at: projectAutomationTriggers.updated_at,
      });

    if (!updatedTrigger)
      throw new AppError(
        "Failed to rotate project automation trigger token",
        500,
      );

    res.status(200).json({
      message: "Project automation trigger token rotated successfully",
      data: {
        trigger: updatedTrigger,
        secret,
        webhook_url: `${env.BACKEND_URL.replace(/\/+$/, "")}/v1/webhook/project-automation/${updatedTrigger.id}`,
      },
    });
  },
);
