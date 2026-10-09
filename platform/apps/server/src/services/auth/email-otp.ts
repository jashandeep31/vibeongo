import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  and,
  authSessions,
  db,
  desc,
  emailAuthChallenges,
  eq,
  gt,
  isNull,
  sql,
  users,
  userPasswordCredentials,
  type Transaction,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";
import { hashPassword } from "../../lib/password.js";
import { requireAuthEmailConfiguration } from "../mail/send-mail.js";
import { addMailOtpJob } from "../../jobs/mail.js";
import { failMailChallenge } from "../mail/process-mail-job.js";

export type OtpPurpose = "signup_verification" | "password_reset";
const lifetime = 10 * 60 * 1000;
const cooldown = 60 * 1000;
const invalidCode = () =>
  new AppError("Invalid or expired verification code", 400);
const emailMatches = (email: string) =>
  sql`lower(${users.email}) = lower(${email})`;
const eligible = (
  user: typeof users.$inferSelect,
  credential: typeof userPasswordCredentials.$inferSelect | undefined,
) =>
  user.status === "active" &&
  user.primary_login_method === "email_password" &&
  !!credential &&
  credential.revoked_at === null;
const digest = (id: string, purpose: string, otp: string) =>
  createHmac("sha256", env.EMAIL_OTP_HASH_SECRET!)
    .update(`${id}:${purpose}:${otp}`)
    .digest("hex");
export const challengeMetadata = (id: string) => ({
  challengeId: id,
  expiresInSeconds: lifetime / 1000,
  resendAfterSeconds: cooldown / 1000,
});

export function assertEmailOtpConfigured() {
  try {
    requireAuthEmailConfiguration();
  } catch {
    throw new AppError("Authentication email is temporarily unavailable", 503, {
      reportToSentry: false,
    });
  }
}

// Caller must hold the user row lock. Never perform email delivery inside a transaction.
export async function stageEmailOtp(
  tx: Transaction,
  user: typeof users.$inferSelect,
  purpose: OtpPurpose,
  staged?: { passwordHash: string; name: string },
) {
  const now = new Date();
  const [latest] = await tx
    .select()
    .from(emailAuthChallenges)
    .where(
      and(
        eq(emailAuthChallenges.user_id, user.id),
        eq(emailAuthChallenges.purpose, purpose),
      ),
    )
    .orderBy(desc(emailAuthChallenges.created_at))
    .limit(1);
  if (
    latest &&
    latest.delivery_status !== "failed" &&
    now.getTime() - latest.created_at.getTime() < cooldown
  ) {
    throw new AppError(
      "Please wait 60 seconds before requesting another code",
      429,
    );
  }
  await tx
    .update(emailAuthChallenges)
    .set({ consumed_at: now, staged_password_hash: null, staged_name: null })
    .where(
      and(
        eq(emailAuthChallenges.user_id, user.id),
        eq(emailAuthChallenges.purpose, purpose),
        isNull(emailAuthChallenges.consumed_at),
      ),
    );
  const id = randomUUID();
  const otp = randomInt(0, 1000000).toString().padStart(6, "0");
  await tx.insert(emailAuthChallenges).values({
    id,
    user_id: user.id,
    purpose,
    email: user.email.toLowerCase(),
    otp_digest: digest(id, purpose, otp),
    staged_password_hash: staged?.passwordHash,
    staged_name: staged?.name,
    expires_at: new Date(now.getTime() + lifetime),
    created_at: now,
  });
  return { id, otp, email: user.email, purpose };
}

export async function enqueueEmailOtp(
  challenge: Awaited<ReturnType<typeof stageEmailOtp>>,
) {
  try {
    await addMailOtpJob(challenge.id, challenge.otp);
  } catch {
    await failMailChallenge(challenge.id);
    throw new AppError(
      "Could not queue the email. Please try again shortly",
      503,
      { reportToSentry: false },
    );
  }
  return challengeMetadata(challenge.id);
}

export async function resendVerification(email: string, challengeId: string) {
  assertEmailOtpConfigured();
  const unavailable = () =>
    new AppError(
      "This signup request is no longer available. Enter your signup details again to request a new code",
      400,
      { code: "SIGNUP_RESTART_REQUIRED" },
    );
  const staged = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(emailMatches(email))
      .for("update");
    if (!user) throw unavailable();
    const [credential] = await tx
      .select()
      .from(userPasswordCredentials)
      .where(eq(userPasswordCredentials.user_id, user.id));
    const [previous] = await tx
      .select()
      .from(emailAuthChallenges)
      .where(
        and(
          eq(emailAuthChallenges.id, challengeId),
          eq(emailAuthChallenges.user_id, user.id),
        ),
      )
      .for("update");
    if (
      !eligible(user, credential) ||
      user.email_verified_at ||
      !previous ||
      previous.purpose !== "signup_verification" ||
      (previous.consumed_at && previous.delivery_status !== "failed") ||
      !previous.staged_password_hash ||
      !previous.staged_name ||
      previous.email !== user.email.toLowerCase()
    )
      throw unavailable();
    // A failed, replaced challenge must not restore an older staged password.
    const [latest] = await tx
      .select({ id: emailAuthChallenges.id })
      .from(emailAuthChallenges)
      .where(
        and(
          eq(emailAuthChallenges.user_id, user.id),
          eq(emailAuthChallenges.purpose, "signup_verification"),
        ),
      )
      .orderBy(desc(emailAuthChallenges.created_at))
      .limit(1);
    if (latest?.id !== previous.id) throw unavailable();
    return stageEmailOtp(tx, user, "signup_verification", {
      passwordHash: previous.staged_password_hash,
      name: previous.staged_name,
    });
  });
  return enqueueEmailOtp(staged);
}

export async function forgotPassword(email: string) {
  const fallback = challengeMetadata(randomUUID());
  // All recipients get the same response, including when sending is unavailable.
  try {
    assertEmailOtpConfigured();
    const staged = await db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(emailMatches(email))
        .for("update");
      if (!user) return undefined;
      const [credential] = await tx
        .select()
        .from(userPasswordCredentials)
        .where(eq(userPasswordCredentials.user_id, user.id));
      if (!eligible(user, credential) || !user.email_verified_at)
        return undefined;
      return stageEmailOtp(tx, user, "password_reset");
    });
    if (!staged) return fallback;
    return await enqueueEmailOtp(staged);
  } catch {
    return fallback;
  }
}

export async function consumeEmailOtp(
  input: {
    email: string;
    challengeId: string;
    otp: string;
    newPassword?: string;
  },
  purpose: OtpPurpose,
) {
  assertEmailOtpConfigured();
  const newHash =
    purpose === "password_reset" && input.newPassword
      ? await hashPassword(input.newPassword)
      : undefined;
  const success = await db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(emailMatches(input.email))
      .for("update");
    if (!user) return false;
    const [credential] = await tx
      .select()
      .from(userPasswordCredentials)
      .where(eq(userPasswordCredentials.user_id, user.id))
      .for("update");
    const [challenge] = await tx
      .select()
      .from(emailAuthChallenges)
      .where(
        and(
          eq(emailAuthChallenges.id, input.challengeId),
          eq(emailAuthChallenges.user_id, user.id),
        ),
      )
      .for("update");
    const now = new Date();
    if (
      !eligible(user, credential) ||
      !challenge ||
      challenge.purpose !== purpose ||
      challenge.email !== user.email.toLowerCase() ||
      challenge.consumed_at ||
      challenge.delivery_status !== "sent" ||
      challenge.expires_at <= now ||
      challenge.attempt_count >= 5 ||
      (purpose === "signup_verification"
        ? !!user.email_verified_at
        : !user.email_verified_at)
    )
      return false;
    // Keep a persistent account budget across OTP rotations (not just per-code attempts).
    const [budget] = await tx
      .select({
        attempts: sql<number>`coalesce(sum(${emailAuthChallenges.attempt_count}), 0)::int`,
      })
      .from(emailAuthChallenges)
      .where(
        and(
          eq(emailAuthChallenges.user_id, user.id),
          eq(emailAuthChallenges.purpose, purpose),
          gt(
            emailAuthChallenges.created_at,
            new Date(now.getTime() - 15 * 60 * 1000),
          ),
        ),
      );
    if ((budget?.attempts ?? 0) >= 5) return false;
    const valid = timingSafeEqual(
      Buffer.from(challenge.otp_digest, "hex"),
      Buffer.from(digest(challenge.id, purpose, input.otp), "hex"),
    );
    if (!valid) {
      // Return instead of throwing so the increment commits before the HTTP error.
      await tx
        .update(emailAuthChallenges)
        .set({ attempt_count: challenge.attempt_count + 1 })
        .where(eq(emailAuthChallenges.id, challenge.id));
      return false;
    }
    const passwordHash =
      purpose === "signup_verification"
        ? challenge.staged_password_hash
        : newHash;
    if (
      !passwordHash ||
      (purpose === "signup_verification" && !challenge.staged_name)
    )
      return false;
    await tx
      .update(userPasswordCredentials)
      .set({ password_hash: passwordHash, updated_at: now })
      .where(eq(userPasswordCredentials.user_id, user.id));
    await tx
      .update(users)
      .set({
        ...(purpose === "signup_verification"
          ? { email_verified_at: now, first_name: challenge.staged_name! }
          : {}),
        auth_version: user.auth_version + 1,
        updated_at: now,
      })
      .where(eq(users.id, user.id));
    // Also invalidate pre-verification sessions so old tokens cannot become valid again.
    await tx
      .update(authSessions)
      .set({ revoked_at: now })
      .where(
        and(eq(authSessions.user_id, user.id), isNull(authSessions.revoked_at)),
      );
    await tx
      .update(emailAuthChallenges)
      .set({ consumed_at: now, staged_password_hash: null, staged_name: null })
      .where(
        and(
          eq(emailAuthChallenges.user_id, user.id),
          isNull(emailAuthChallenges.consumed_at),
        ),
      );
    return true;
  });
  if (!success) throw invalidCode();
}

// Run from the server's scheduled maintenance worker; retain attempt history for 24 hours.
export async function cleanupEmailAuthChallenges() {
  const now = new Date();
  await db
    .update(emailAuthChallenges)
    .set({ staged_password_hash: null, staged_name: null })
    .where(sql`${emailAuthChallenges.expires_at} <= ${now}`);
  await db
    .delete(emailAuthChallenges)
    .where(
      sql`${emailAuthChallenges.expires_at} < ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}`,
    );
}
