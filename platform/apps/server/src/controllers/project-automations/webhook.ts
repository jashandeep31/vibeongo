import {
  and,
  db,
  eq,
  isNull,
  projectAutomations,
  projectAutomationTriggerRuns,
  projectAutomationTriggers,
} from "@repo/db";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { compareSHA256andReturnString } from "../../lib/sha256.js";
import { addProjectAutomationWebhookJob } from "../../jobs/project-automation-webhook.js";
export const projectAutomationWebhook = catchAsync(
  async (req: Request, res: Response) => {
    const projectAutomationTriggerId = z.uuid().parse(req.params.id);

    const authorizationHeader = req.headers.authorization?.trim();
    const tokenHeader =
      req.get("x-webhook-token")?.trim() ?? authorizationHeader;
    const webhookToken = tokenHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!webhookToken) throw new AppError("No authorization header", 401);

    const [projectAutomationTrigger] = await db
      .select({
        id: projectAutomationTriggers.id,
        webhook_secret: projectAutomationTriggers.webhook_secret,
        project_automation_id: projectAutomations.id,
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
          eq(projectAutomationTriggers.id, projectAutomationTriggerId),
          isNull(projectAutomations.deleted_at),
        ),
      )
      .limit(1);

    if (!projectAutomationTrigger)
      throw new AppError("Project automation trigger not found", 404);

    const isAuthenticatedRequest = await compareSHA256andReturnString(
      webhookToken,
      projectAutomationTrigger.webhook_secret,
    );
    if (!isAuthenticatedRequest) throw new AppError("Unauthorized", 401);

    const input =
      typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {});

    const [triggerRun] = await db
      .insert(projectAutomationTriggerRuns)
      .values({
        project_automation_trigger_id: projectAutomationTrigger.id,
        input,
      })
      .returning({ id: projectAutomationTriggerRuns.id });

    if (!triggerRun) {
      throw new AppError("Failed to create project automation trigger run", 500);
    }

    try {
      await addProjectAutomationWebhookJob({
        automationId: projectAutomationTrigger.project_automation_id,
        automationTriggerId: projectAutomationTrigger.id,
        automationTriggerRunId: triggerRun.id,
        input,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to queue webhook run";

      await db
        .update(projectAutomationTriggerRuns)
        .set({
          status: "failed",
          error: message.slice(0, 255),
          updated_at: new Date(),
        })
        .where(eq(projectAutomationTriggerRuns.id, triggerRun.id));

      throw error;
    }

    res.status(202).json({
      message: "Project automation webhook accepted",
      data: { trigger_run_id: triggerRun.id },
    });
  },
);
