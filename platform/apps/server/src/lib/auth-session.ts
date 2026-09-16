import crypto from "crypto";
import { and, authSessions, db, eq, gt, isNull } from "@repo/db";

export const webSessionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createWebSession = async (input: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();

  await db.insert(authSessions).values({
    user_id: input.userId,
    token_hash: hashToken(token),
    client_type: "web",
    expires_at: new Date(now.getTime() + webSessionMaxAgeMs),
    last_used_at: now,
    ...(input.ipAddress ? { ip_address: input.ipAddress } : {}),
    ...(input.userAgent ? { user_agent: input.userAgent } : {}),
  });

  return token;
};

export const findWebSession = async (token: string) => {
  const [session] = await db
    .select()
    .from(authSessions)
    .where(
      and(
        eq(authSessions.token_hash, hashToken(token)),
        eq(authSessions.client_type, "web"),
        isNull(authSessions.revoked_at),
        gt(authSessions.expires_at, new Date()),
      ),
    )
    .limit(1);

  if (!session) return undefined;

  await db
    .update(authSessions)
    .set({ last_used_at: new Date() })
    .where(eq(authSessions.id, session.id));

  return session;
};

export const revokeWebSession = async (token: string) => {
  await db
    .update(authSessions)
    .set({ revoked_at: new Date() })
    .where(
      and(
        eq(authSessions.token_hash, hashToken(token)),
        eq(authSessions.client_type, "web"),
        isNull(authSessions.revoked_at),
      ),
    );
};
