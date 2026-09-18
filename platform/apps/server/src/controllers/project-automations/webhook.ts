import {
  and,
  db,
  eq,
  projectAutomations,
  projectAutomationTriggers,
} from "@repo/db";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { compareSHA256andReturnString } from "../../lib/sha256.js";
export const projectAutomationWebhook = catchAsync(
  async (req: Request, res: Response) => {
    const projectAutomationTriggerId = z.uuid().parse(req.params.id);

    const BEARER_TOKEN = req.headers.authorization;
    if (!BEARER_TOKEN) throw new AppError("No authorization header", 401);

    const [projectAutomationTriggerWithAutomation] = await db
      .select()
      .from(projectAutomationTriggers)
      .innerJoin(
        projectAutomations,
        eq(
          projectAutomations.id,
          projectAutomationTriggers.project_automation_id,
        ),
      )
      .where(and(eq(projectAutomationTriggers.id, projectAutomationTriggerId)));

    //TODO: show this error in the trigger call too
    if (!projectAutomationTriggerWithAutomation)
      throw new Error("Automation not found");

    const {
      project_automations: projectAutomation,
      project_automation_triggers: projectAutomationTrigger,
    } = projectAutomationTriggerWithAutomation;

    const isAuthenticatedRequest = compareSHA256andReturnString(
      BEARER_TOKEN,
      projectAutomationTrigger.webhook_secret,
    );
    if (!isAuthenticatedRequest) throw new AppError("Unauthorized", 401);

    // const { body } = req;

    res.status(200).json({ message: "ok" });
  },
);
