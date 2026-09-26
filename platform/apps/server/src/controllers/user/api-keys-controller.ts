import { createHash, randomBytes } from "node:crypto";
import {
  and,
  db,
  desc,
  eq,
  isNull,
  USER_API_KEY_PREFIX,
  usersApiKeys,
} from "@repo/db";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";

const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(255),
});

const listApiKeysSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
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

export const getApiKeys = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);

  const { page, limit } = listApiKeysSchema.parse(req.query);
  const rows = await db
    .select({
      id: usersApiKeys.id,
      name: usersApiKeys.name,
      expires_at: usersApiKeys.expires_at,
      revoked_at: usersApiKeys.revoked_at,
      last_used_at: usersApiKeys.last_used_at,
      created_at: usersApiKeys.created_at,
    })
    .from(usersApiKeys)
    .where(eq(usersApiKeys.user_id, user.id))
    .orderBy(desc(usersApiKeys.created_at), desc(usersApiKeys.id))
    .limit(limit + 1)
    .offset((page - 1) * limit);

  res.status(200).json({
    data: rows.slice(0, limit),
    page,
    hasNext: rows.length > limit,
  });
});

export const revokeApiKey = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication is required", 401);

  const { id } = z.object({ id: z.uuid() }).parse(req.params);
  const [revokedKey] = await db
    .update(usersApiKeys)
    .set({ revoked_at: new Date(), updated_at: new Date() })
    .where(
      and(
        eq(usersApiKeys.id, id),
        eq(usersApiKeys.user_id, user.id),
        isNull(usersApiKeys.revoked_at),
      ),
    )
    .returning({ id: usersApiKeys.id });

  if (!revokedKey) {
    const [key] = await db
      .select({ id: usersApiKeys.id })
      .from(usersApiKeys)
      .where(and(eq(usersApiKeys.id, id), eq(usersApiKeys.user_id, user.id)))
      .limit(1);
    if (!key) throw new AppError("API key not found", 404);
  }

  res.status(200).json({ message: "API key revoked" });
});
