import {
  and,
  db,
  eq,
  isNull,
  projectAutomations,
  projectAutomationRuns,
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
        provider: projectAutomationTriggers.provider,
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

    let processedWebhook: ProcessedWebhookPayload;

    switch (projectAutomationTrigger.provider) {
      case "sentry":
        processedWebhook = processSentryWebhook(req.body);
        break;
      default:
        throw new AppError(
          `Unsupported project automation provider: ${projectAutomationTrigger.provider}`,
          400,
        );
    }

    const [automationRun] = await db
      .insert(projectAutomationRuns)
      .values({
        project_automation_id: projectAutomationTrigger.project_automation_id,
        project_automation_trigger_id: projectAutomationTrigger.id,
        source: "webhook",
        status: "queued",
        provider: projectAutomationTrigger.provider,
        project_request_unique_id: processedWebhook.projectRequestUniqueId,
        input: processedWebhook.input,
      })
      .onConflictDoNothing({
        target: [
          projectAutomationRuns.project_automation_trigger_id,
          projectAutomationRuns.provider,
          projectAutomationRuns.project_request_unique_id,
        ],
      })
      .returning({ id: projectAutomationRuns.id });

    if (!automationRun) {
      const [existingRun] = await db
        .select({ id: projectAutomationRuns.id })
        .from(projectAutomationRuns)
        .where(
          and(
            eq(
              projectAutomationRuns.project_automation_trigger_id,
              projectAutomationTrigger.id,
            ),
            eq(
              projectAutomationRuns.provider,
              projectAutomationTrigger.provider,
            ),
            eq(
              projectAutomationRuns.project_request_unique_id,
              processedWebhook.projectRequestUniqueId,
            ),
          ),
        )
        .limit(1);

      if (!existingRun) {
        throw new AppError(
          "Failed to find duplicate project automation run",
          500,
        );
      }

      res.status(202).json({
        message: "Project automation webhook already accepted",
        data: { automation_run_id: existingRun.id },
      });
      return;
    }

    try {
      await addProjectAutomationWebhookJob({
        automationRunId: automationRun.id,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to queue webhook run";

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

    res.status(202).json({
      message: "Project automation webhook accepted",
      data: { automation_run_id: automationRun.id },
    });
  },
);

type ProcessedWebhookPayload = {
  input: string;
  projectRequestUniqueId: string;
};

function processSentryWebhook(body: unknown): ProcessedWebhookPayload {
  let payload: unknown = body;

  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      throw new AppError("Invalid Sentry webhook payload", 400);
    }
  }

  const payloadRecord =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;
  const dataRecord =
    payloadRecord?.data && typeof payloadRecord.data === "object"
      ? (payloadRecord.data as Record<string, unknown>)
      : null;
  const eventRecord =
    dataRecord?.event && typeof dataRecord.event === "object"
      ? (dataRecord.event as Record<string, unknown>)
      : null;
  const eventId = [
    payloadRecord?.event_id,
    dataRecord?.event_id,
    eventRecord?.event_id,
  ].find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  if (!eventId) {
    throw new AppError("Sentry webhook event ID is required", 400);
  }

  return {
    projectRequestUniqueId: eventId.trim(),
    input: typeof body === "string" ? body : JSON.stringify(body ?? {}),
  };
}
