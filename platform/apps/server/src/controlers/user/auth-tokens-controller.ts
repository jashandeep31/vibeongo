import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import { authTokens, db, eq } from "@repo/db";
import * as crypto from "crypto";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

// --- Get all the auth tokens for user ---
export const getAuthTokens = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) throw new AppError("Authentication is required", 400);

  const rows = await db
    .select()
    .from(authTokens)
    .where(eq(authTokens.user_id, user.id));

  res.status(200).json({ data: rows });
});

const createAuthTokenSchema = z.object({
  name: z.string().max(255).min(3),
  permission: z.enum(["read", "write"]),
});
// --- Create the auth token for user to get used by apis ---
export const createAuthToken = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 400);

    const body = createAuthTokenSchema.parse(req.body);
    const { name, permission } = body;

    const id = `vibe_` + createId();

    const secret = crypto.randomBytes(32).toString("base64");

    await db.insert(authTokens).values({
      user_id: user.id,
      name,
      key_id: id,
      secret,
      permission,
      valid_till: new Date(),
      terminated_at: null,
    });

    res.status(201).json({
      message: "Successfully had created the project intance",
      data: {
        api_secret: secret,
        api_key: id,
      },
    });
  },
);
