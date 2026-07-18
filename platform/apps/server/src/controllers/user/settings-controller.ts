import { Request, Response } from "express";
import { db, eq, userSettings } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { z } from "zod";

const updateUserSettingsSchema = z.object({
  defaultPrModel: z.string().optional().nullable(),
  defaultIssueFixerModel: z.string().optional().nullable(),
  defaultCommentModel: z.string().optional().nullable(),
  defaultModel: z.string().optional().nullable(),
  telegramChatId: z.number().int().optional().nullable(),
  defaultIssueInstanceAutoTerminateAfterMinutes: z
    .number()
    .int()
    .min(15)
    .max(1200)
    .optional(),
  defaultPrInstanceAutoTerminateAfterMinutes: z
    .number()
    .int()
    .min(15)
    .max(1200)
    .optional(),
  defaultManualInstanceAutoTerminateAfterMinutes: z
    .number()
    .int()
    .min(15)
    .max(1200)
    .optional(),
});

export const updateUserSettings = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication failed", 401);

    const parsedBody = updateUserSettingsSchema.parse(req.body);
    const updateData: Partial<typeof userSettings.$inferInsert> = {
      updated_at: new Date(),
      ...(Object.hasOwn(parsedBody, "defaultPrModel")
        ? { default_pr_model: parsedBody.defaultPrModel }
        : {}),
      ...(Object.hasOwn(parsedBody, "defaultIssueFixerModel")
        ? { default_issue_fixer_model: parsedBody.defaultIssueFixerModel }
        : {}),
      ...(Object.hasOwn(parsedBody, "defaultCommentModel")
        ? { default_comment_model: parsedBody.defaultCommentModel }
        : {}),
      ...(Object.hasOwn(parsedBody, "defaultModel")
        ? { default_model: parsedBody.defaultModel }
        : {}),
      ...(Object.hasOwn(parsedBody, "telegramChatId")
        ? { telegram_chat_id: parsedBody.telegramChatId }
        : {}),
      ...(Object.hasOwn(
        parsedBody,
        "defaultIssueInstanceAutoTerminateAfterMinutes",
      )
        ? {
            default_issue_instance_auto_terminate_after_minutes:
              parsedBody.defaultIssueInstanceAutoTerminateAfterMinutes,
          }
        : {}),
      ...(Object.hasOwn(
        parsedBody,
        "defaultPrInstanceAutoTerminateAfterMinutes",
      )
        ? {
            default_pr_instance_auto_terminate_after_minutes:
              parsedBody.defaultPrInstanceAutoTerminateAfterMinutes,
          }
        : {}),
      ...(Object.hasOwn(
        parsedBody,
        "defaultManualInstanceAutoTerminateAfterMinutes",
      )
        ? {
            default_manual_instance_auto_terminate_after_minutes:
              parsedBody.defaultManualInstanceAutoTerminateAfterMinutes,
          }
        : {}),
    };

    if (Object.keys(updateData).length === 1) {
      throw new AppError("No settings fields provided", 400);
    }

    const [settings] = await db
      .update(userSettings)
      .set(updateData)
      .where(eq(userSettings.user_id, user.id))
      .returning();

    if (!settings) {
      throw new AppError("User settings not found", 404);
    }

    res.status(200).json({
      data: settings,
    });
  },
);
export const getUserSettings = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.user_id, user.id));

    if (!settings) {
      throw new AppError("user setting not found ", 404);
    }
    res.status(200).json({
      data: settings,
    });
  },
);
