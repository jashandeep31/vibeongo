import { and, db, eq, userProviderCredentials } from "@repo/db";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { decryptData, encryptData } from "../../lib/encryption-decryption.js";

const REFRESH_WINDOW_MS = 5 * 60 * 1000;
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_ENDPOINT = "https://auth.openai.com/api/accounts/oauth/token";

const storedTokensSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  client_id: z.string().min(1),
  id_token: z.string().optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
  expires_in: z.number().int().positive().optional(),
  earliest_refresh_at: z.number().int().nonnegative().optional(),
});

const refreshedTokensSchema = storedTokensSchema
  .omit({ client_id: true })
  .extend({ expires_in: z.number().int().positive().max(86_400).default(3600) });

type ChatgptAccessToken = {
  credential_id: string;
  access_token: string;
  access_token_expires_at: Date;
  scopes: string[];
};

export function getChatgptAccessToken(userId: string): Promise<ChatgptAccessToken>;
export function getChatgptAccessToken(
  userId: string,
  options: { optional: true },
): Promise<ChatgptAccessToken | null>;
export async function getChatgptAccessToken(
  userId: string,
  options?: { optional: true },
) {
  return db.transaction(async (tx) => {
    // A database lock serializes rotation across VMs and server processes.
    // Always read the latest token set after obtaining the lock.
    const [credential] = await tx
      .select()
      .from(userProviderCredentials)
      .where(and(
        eq(userProviderCredentials.user_id, userId),
        eq(userProviderCredentials.provider, "codex"),
      ))
      .for("update");

    if (!credential) {
      if (options?.optional) return null;
      throw new AppError("ChatGPT connection not found", 404);
    }
    if (credential.revoked_at || credential.auth_type !== "oauth") {
      if (options?.optional) return null;
      throw new AppError("ChatGPT connection is unavailable. Sign in again from the CLI", 409);
    }

    let decrypted: unknown;
    try {
      decrypted = JSON.parse(decryptData({
        iv: credential.iv,
        tag: credential.tag,
        encrypted: credential.encrypted_data,
      }));
    } catch {
      throw new AppError("Could not read stored ChatGPT credentials", 500);
    }
    const parsed = storedTokensSchema.safeParse(decrypted);
    if (!parsed.success) {
      throw new AppError("Stored ChatGPT credentials are invalid. Sign in again from the CLI", 409);
    }
    const tokens = parsed.data;
    const now = Date.now();
    const accessExpiry = credential.access_token_expires_at;
    if (accessExpiry && accessExpiry.getTime() > now + REFRESH_WINDOW_MS) {
      return {
        credential_id: credential.id,
        access_token: tokens.access_token,
        access_token_expires_at: accessExpiry,
        scopes: credential.metadata.scopes ?? tokens.scope?.split(/\s+/).filter(Boolean) ?? [],
      };
    }

    if (!credential.refresh_token_expires_at ||
      credential.refresh_token_expires_at.getTime() <= now) {
      throw new AppError("ChatGPT refresh token has expired. Sign in again from the CLI", 409);
    }
    const clientId = credential.metadata.clientID ?? tokens.client_id;
    if (clientId !== tokens.client_id || clientId === "dynamic_agent_client") {
      throw new AppError("Stored ChatGPT client ID is invalid. Sign in again from the CLI", 409);
    }

    let response: globalThis.Response;
    try {
      response = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId,
          refresh_token: tokens.refresh_token,
          resource: "https://api.openai.com/v1",
        }),
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new AppError("Could not reach OpenAI to refresh ChatGPT access", 502);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new AppError("OpenAI returned an invalid refresh response", 502);
    }
    if (!response.ok) {
      const error = z.object({ error: z.string() }).safeParse(body);
      if (error.success && error.data.error === "invalid_grant") {
        throw new AppError("ChatGPT authorization has expired or been revoked. Sign in again from the CLI", 409);
      }
      throw new AppError("OpenAI could not refresh ChatGPT access", 502);
    }
    const refreshed = refreshedTokensSchema.safeParse(body);
    if (!refreshed.success) {
      throw new AppError("OpenAI returned an invalid refresh response", 502);
    }

    const replacement = { ...tokens, ...refreshed.data, client_id: clientId };
    const encrypted = encryptData(JSON.stringify(replacement));
    const renewedAt = new Date();
    const expiresAt = new Date(renewedAt.getTime() + refreshed.data.expires_in * 1000);
    await tx
      .update(userProviderCredentials)
      .set({
        encrypted_data: encrypted.encryptedData,
        iv: encrypted.iv,
        tag: encrypted.tag,
        metadata: {
          clientID: clientId,
          scopes: replacement.scope?.split(/\s+/).filter(Boolean) ??
            credential.metadata.scopes ?? [],
        },
        access_token_expires_at: expiresAt,
        refresh_token_expires_at: new Date(renewedAt.getTime() + REFRESH_TOKEN_LIFETIME_MS),
        updated_at: renewedAt,
      })
      .where(eq(userProviderCredentials.id, credential.id));

    // The transaction commits before the caller can send this response.
    return {
      credential_id: credential.id,
      access_token: refreshed.data.access_token,
      access_token_expires_at: expiresAt,
      scopes: replacement.scope?.split(/\s+/).filter(Boolean) ?? credential.metadata.scopes ?? [],
    };
  });
}
