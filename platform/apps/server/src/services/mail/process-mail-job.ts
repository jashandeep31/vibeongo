import {
  and,
  db,
  emailAuthChallenges,
  eq,
  gt,
  isNull,
  users,
  userPasswordCredentials,
} from "@repo/db";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { MailJobData } from "../../jobs/mail.js";
import { env } from "../../lib/env.js";
import { decryptMailOtp } from "./mail-otp-payload.js";
import { sendAuthOtpEmail } from "./send-mail.js";

export async function failMailChallenge(challengeId: string) {
  await db
    .update(emailAuthChallenges)
    .set({
      delivery_status: "failed",
      consumed_at: new Date(),
      // Keep signup details until expiry so the user can request a fresh code.
      // The failed code remains consumed and can never verify the account.
    })
    .where(
      and(
        eq(emailAuthChallenges.id, challengeId),
        eq(emailAuthChallenges.delivery_status, "pending"),
        isNull(emailAuthChallenges.consumed_at),
      ),
    );
}

export async function processMailJob(data: MailJobData, finalAttempt: boolean) {
  try {
    const [row] = await db
      .select({
        challenge: emailAuthChallenges,
        user: users,
        credential: userPasswordCredentials,
      })
      .from(emailAuthChallenges)
      .innerJoin(users, eq(users.id, emailAuthChallenges.user_id))
      .leftJoin(
        userPasswordCredentials,
        eq(userPasswordCredentials.user_id, users.id),
      )
      .where(eq(emailAuthChallenges.id, data.challengeId));
    if (
      !row ||
      row.challenge.consumed_at ||
      row.challenge.delivery_status !== "pending"
    )
      return;
    const { challenge, user, credential } = row;
    const purpose = challenge.purpose;
    if (purpose !== "signup_verification" && purpose !== "password_reset") {
      await failMailChallenge(data.challengeId);
      return;
    }
    if (
      challenge.expires_at <= new Date() ||
      user.status !== "active" ||
      user.primary_login_method !== "email_password" ||
      !credential ||
      credential.revoked_at ||
      challenge.email !== user.email.toLowerCase() ||
      (purpose === "signup_verification"
        ? !!user.email_verified_at
        : purpose === "password_reset"
          ? !user.email_verified_at
          : true)
    ) {
      await failMailChallenge(data.challengeId);
      return;
    }
    const otp = decryptMailOtp(data.challengeId, data.encryptedOtp);
    const digest = createHmac("sha256", env.EMAIL_OTP_HASH_SECRET!)
      .update(`${challenge.id}:${purpose}:${otp}`)
      .digest();
    const storedDigest = Buffer.from(challenge.otp_digest, "hex");
    if (
      storedDigest.length !== digest.length ||
      !timingSafeEqual(storedDigest, digest)
    ) {
      await failMailChallenge(data.challengeId);
      return;
    }
    await sendAuthOtpEmail({ toAddress: challenge.email, otp, purpose });
    await db
      .update(emailAuthChallenges)
      .set({ delivery_status: "sent" })
      .where(
        and(
          eq(emailAuthChallenges.id, challenge.id),
          eq(emailAuthChallenges.delivery_status, "pending"),
          isNull(emailAuthChallenges.consumed_at),
          gt(emailAuthChallenges.expires_at, new Date()),
        ),
      );
  } catch {
    if (finalAttempt) {
      try {
        await failMailChallenge(data.challengeId);
      } catch {
        throw new Error("Mail delivery failed; challenge cleanup unavailable");
      }
    }
    // Never put provider errors, recipients, or OTPs in BullMQ failure logs.
    throw new Error("Mail delivery failed");
  }
}
