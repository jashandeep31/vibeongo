import { randomBytes } from "node:crypto";
import { Request, Response } from "express";
import {
  and,
  db,
  eq,
  isNull,
  projectAutomationTriggerProviders,
  projectAutomationTriggers,
  projectAutomations,
} from "@repo/db";
import { z } from "@repo/shared";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { env } from "../../lib/env.js";
import { hashToSHA256 } from "../../lib/sha256.js";

export const createProjectAutomationTrigger = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("User not found", 401);

    const { id: projectAutomationId } = z
      .object({ id: z.uuid() })
      .parse(req.params);
    const { name, provider } = z
      .object({
        name: z
          .string()
          .trim()
          .min(3, "Trigger name must be at least 3 characters")
          .max(20, "Trigger name must be at most 20 characters"),
        provider: z.enum(projectAutomationTriggerProviders.enumValues),
      })
      .parse(req.body);

    const [automation] = await db
      .select({ id: projectAutomations.id })
      .from(projectAutomations)
      .where(
        and(
          eq(projectAutomations.id, projectAutomationId),
          eq(projectAutomations.user_id, user.id),
          isNull(projectAutomations.deleted_at),
        ),
      )
      .limit(1);

    if (!automation) throw new AppError("Project automation not found", 404);

    const secret = `vgo_${randomBytes(32).toString("base64url")}`;
    const webhookSecret = await hashToSHA256(secret);

    const [trigger] = await db
      .insert(projectAutomationTriggers)
      .values({
        name,
        project_automation_id: automation.id,
        webhook_secret: webhookSecret,
        provider,
      })
      .returning({
        id: projectAutomationTriggers.id,
        name: projectAutomationTriggers.name,
        project_automation_id: projectAutomationTriggers.project_automation_id,
        created_at: projectAutomationTriggers.created_at,
      });

    if (!trigger)
      throw new AppError("Failed to create project automation trigger", 500);

    res.status(201).json({
      message: "Project automation trigger created successfully",
      data: {
        trigger,
        secret,
        webhook_url: `${env.BACKEND_URL.replace(/\/+$/, "")}/v1/webhook/project-automation/${trigger.id}`,
      },
    });
  },
);
