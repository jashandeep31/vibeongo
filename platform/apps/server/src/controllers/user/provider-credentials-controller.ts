import { db, eq, userProviderCredentials } from "@repo/db";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { encryptData } from "../../lib/encryption-decryption.js";

const tokenSchema = z.string().trim().min(1).max(32_768);
const codexCredentialsSchema = z.object({
  client_id: z.string().trim().min(1).max(255),
  access_token: tokenSchema,
  refresh_token: tokenSchema,
  id_token: tokenSchema.optional(),
  token_type: z.literal("Bearer").optional(),
  scope: z.string().max(4096).optional(),
  expires_in: z.number().int().positive().optional(),
  earliest_refresh_at: z.number().int().nonnegative().optional(),
});

const ACCESS_TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

const safeProviderCredentialSelection = {
  provider: userProviderCredentials.provider,
  auth_type: userProviderCredentials.auth_type,
  access_token_expires_at: userProviderCredentials.access_token_expires_at,
  refresh_token_expires_at: userProviderCredentials.refresh_token_expires_at,
  updated_at: userProviderCredentials.updated_at,
};

export const getProviderCredentials = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const credentials = await db
      .select(safeProviderCredentialSelection)
      .from(userProviderCredentials)
      .where(eq(userProviderCredentials.user_id, user.id));

    res.set("Cache-Control", "no-store");
    res.status(200).json({ data: credentials });
  },
);

export const saveProviderCredentials = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    if (req.params.provider !== "codex") {
      throw new AppError("Unsupported provider. Only codex is supported", 400);
    }

    const parsed = codexCredentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        "Invalid Codex credentials. Provide client_id, access_token and refresh_token",
        400,
      );
    }

    const encrypted = encryptData(JSON.stringify(parsed.data));
    const now = new Date();
    const values = {
      auth_type: "oauth" as const,
      encrypted_data: encrypted.encryptedData,
      iv: encrypted.iv,
      tag: encrypted.tag,
      access_token_expires_at: new Date(now.getTime() + ACCESS_TOKEN_LIFETIME_MS),
      refresh_token_expires_at: new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_MS),
      revoked_at: null,
      updated_at: now,
    };

    const [connection] = await db
      .insert(userProviderCredentials)
      .values({ user_id: user.id, provider: "codex", ...values })
      .onConflictDoUpdate({
        target: [userProviderCredentials.user_id, userProviderCredentials.provider],
        set: values,
      })
      .returning(safeProviderCredentialSelection);

    res.set("Cache-Control", "no-store");
    res.status(200).json({
      message: "Codex credentials saved successfully",
      data: connection,
    });
  },
);
