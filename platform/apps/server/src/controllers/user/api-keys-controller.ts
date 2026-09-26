import { createHash, randomBytes } from "node:crypto";
import { db, USER_API_KEY_PREFIX, usersApiKeys } from "@repo/db";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";

const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(255),
});

export const createApiKey = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);

  const { name } = createApiKeySchema.parse(req.body);
  const key = `${USER_API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  const keyHash = createHash("sha256").update(key).digest("hex");
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const [createdKey] = await db
    .insert(usersApiKeys)
    .values({
      user_id: user.id,
      name,
      key_hash: keyHash,
      expires_at: expiresAt,
    })
    .returning({ id: usersApiKeys.id });

  if (!createdKey) throw new AppError("Failed to create API key", 500);

  res.set("Cache-Control", "no-store");
  res.status(201).json({
    data: { id: createdKey.id, name, key, expires_at: expiresAt },
  });
});
