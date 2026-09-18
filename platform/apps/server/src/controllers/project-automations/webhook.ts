import {
  and,
  asc,
  db,
  eq,
  isNull,
  projectAutomations,
  projectAutomationTasks,
  projectAutomationTriggers,
} from "@repo/db";
import { resolveProjectAutomationWebhookTasksAgent } from "../../ai/ai-agents/resolve-project-automation-webhook-tasks-agent.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { compareSHA256andReturnString } from "../../lib/sha256.js";
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

    const tasks = await db
      .select()
      .from(projectAutomationTasks)
      .where(
        eq(
          projectAutomationTasks.project_automation_id,
          projectAutomationTrigger.project_automation_id,
        ),
      )
      .orderBy(asc(projectAutomationTasks.order_number));

    const input =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    const resolvedTasks = await resolveProjectAutomationWebhookTasksAgent({
      input,
      tasks,
    });
    console.log("Resolved automation webhook tasks:", resolvedTasks);

    res.status(200).json({ message: "Project automation webhook verified" });
  },
);
