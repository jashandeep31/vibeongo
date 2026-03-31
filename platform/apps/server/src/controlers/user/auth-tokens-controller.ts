import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import { and, authTokens, db, eq } from "@repo/db";
import * as crypto from "crypto";
import { createId } from "@paralleldrive/cuid2";
import { createAuthTokenSchema } from "@repo/shared";

// --- Get all the auth tokens for user ---
export const getAuthTokens = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) throw new AppError("Authentication is required", 400);

  const rows = await db
    .select({
      id: authTokens.id,
      user_id: authTokens.user_id,
      name: authTokens.name,
      permission: authTokens.permission,
      valid_till: authTokens.valid_till,
      terminated_at: authTokens.terminated_at,
      created_at: authTokens.created_at,
      updated_at: authTokens.updated_at,
    })
    .from(authTokens)
    .where(eq(authTokens.user_id, user.id));

  res.status(200).json({ data: rows });
});

// --- Create the auth token for user to get used by apis ---
export const createAuthToken = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 400);

    const body = createAuthTokenSchema.parse(req.body);
    const { name, permission } = body;

    const token = `vibe_` + createId() + crypto.randomBytes(16).toString("hex");
    const hash = crypto.createHash("sha256").update(token).digest("hex");

    await db.insert(authTokens).values({
      user_id: user.id,
      name,
      secret: hash,
      permission,
      valid_till: null,
      terminated_at: null,
    });

    res.status(201).json({
      message: "Auth token created successfully",
      data: {
        token,
      },
    });
  },
);

export const deleteAuthToken = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 400);

    const id = req.params.id;
    if (!id || typeof id !== "string") {
      throw new AppError("Auth token ID is required", 400);
    }

    const result = await db
      .delete(authTokens)
      .where(and(eq(authTokens.id, id), eq(authTokens.user_id, user.id)))
      .returning({ id: authTokens.id });

    if (result.length === 0) {
      throw new AppError("Auth key not found", 404);
    }

    res.status(200).json({ message: "Auth key deleted successfully" });
  },
);
