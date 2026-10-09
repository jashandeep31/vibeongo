import jwt from "jsonwebtoken";
import { env } from "../../lib/env.js";
import { randomBytes } from "node:crypto";
import {
  db,
  eq,
  sql,
  users,
  userPasswordCredentials,
  userSettings,
  userWallet,
  userLoginLogs,
} from "@repo/db";
import type { Transaction } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { createWebSession } from "../../lib/auth-session.js";
import {
  hashPassword,
  verifyPassword,
  getDummyPasswordHash,
  passwordNeedsRehash,
} from "../../lib/password.js";
import {
  assertEmailOtpConfigured,
  stageEmailOtp,
  enqueueEmailOtp,
} from "./email-otp.js";
import type { SignupInput, SigninInput } from "./password-auth-validation.js";

type User = typeof users.$inferSelect;
export type LoginContext = {
  ipAddress?: string;
  userAgent?: string;
  clientType?: "web" | "mobile";
};
const invalidLogin = () => new AppError("Invalid email or password", 401);
const signupConflict = () =>
  new AppError("Unable to create an account with these details", 409);
const emailMatches = (email: string) =>
  sql`lower(${users.email}) = lower(${email})`;

export const toPublicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  firstName: user.first_name,
  lastName: user.last_name,
  primaryLoginMethod: user.primary_login_method,
  emailVerified: user.email_verified_at !== null,
});

async function createLogin(tx: Transaction, user: User, context: LoginContext) {
  const { clientType, ...sessionContext } = context;
  const token =
    clientType === "mobile"
      ? jwt.sign(
          { id: user.id, authVersion: user.auth_version },
          env.JWT_SECRET,
          { expiresIn: "30d" },
        )
      : await createWebSession({ userId: user.id, ...sessionContext }, tx);
  await tx.insert(userLoginLogs).values({
    user_id: user.id,
    login_method: "email_password",
    ...(context.ipAddress ? { ip_address: context.ipAddress } : {}),
    ...(context.userAgent ? { user_agent: context.userAgent } : {}),
  });
  return { user, token };
}

function postgresError(error: unknown): { code?: string; constraint?: string } {
  if (!error || typeof error !== "object") return {};
  const current = error as {
    code?: string;
    constraint?: string;
    cause?: unknown;
  };
  return current.code ? current : postgresError(current.cause);
}

export async function signupWithPassword(
  input: SignupInput,
  _context?: LoginContext,
) {
  assertEmailOtpConfigured();
  const passwordHash = await hashPassword(input.password);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const challenge = await db.transaction(async (tx) => {
        let [user] = await tx
          .select()
          .from(users)
          .where(emailMatches(input.email))
          .for("update");
        if (user) {
          const [credential] = await tx
            .select()
            .from(userPasswordCredentials)
            .where(eq(userPasswordCredentials.user_id, user.id))
            .for("update");
          if (
            user.status !== "active" ||
            user.email_verified_at ||
            user.primary_login_method !== "email_password" ||
            !credential ||
            credential.revoked_at
          )
            throw signupConflict();
        } else {
          [user] = await tx
            .insert(users)
            .values({
              email: input.email,
              username: `vog_${randomBytes(6).toString("hex")}`,
              first_name: input.firstName,
              primary_login_method: "email_password",
              status: "active",
              email_verified_at: null,
            })
            .returning();
          if (!user) throw new AppError("Unable to create user", 500);
          await tx
            .insert(userPasswordCredentials)
            .values({ user_id: user.id, password_hash: passwordHash });
          await tx.insert(userSettings).values({ user_id: user.id });
          await tx.insert(userWallet).values({ user_id: user.id, balance: 0 });
        }
        return stageEmailOtp(tx, user, "signup_verification", {
          passwordHash,
          name: input.firstName,
        });
      });
      return {
        verificationRequired: true as const,
        ...(await enqueueEmailOtp(challenge)),
      };
    } catch (error) {
      const pg = postgresError(error);
      if (pg.code !== "23505") throw error;
      // Retry the transaction after a concurrent signup; the existing user is then locked.
      if (
        [
          "users_username_unique",
          "users_email_unique",
          "users_email_case_insensitive_unique",
        ].includes(pg.constraint ?? "")
      )
        continue;
      throw error;
    }
  }
  throw new AppError("Unable to create an account; try again", 503);
}

export async function signinWithPassword(
  input: SigninInput,
  context: LoginContext,
) {
  const [row] = await db
    .select({ user: users, credential: userPasswordCredentials })
    .from(users)
    .leftJoin(
      userPasswordCredentials,
      eq(users.id, userPasswordCredentials.user_id),
    )
    .where(emailMatches(input.email))
    .limit(1);
  const hash = row?.credential?.password_hash ?? (await getDummyPasswordHash());
  const valid = await verifyPassword(hash, input.password);
  if (
    !valid ||
    !row?.credential ||
    row.user.status !== "active" ||
    row.user.primary_login_method !== "email_password" ||
    row.credential.revoked_at !== null
  ) {
    throw invalidLogin();
  }
  if (!row.user.email_verified_at)
    throw new AppError("Verify your email before signing in", 403, {
      code: "EMAIL_NOT_VERIFIED",
    });
  const replacementHash = passwordNeedsRehash(hash)
    ? await hashPassword(input.password)
    : undefined;
  // Recheck under locks before issuing a session; revocation cannot be overwritten.
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, row.user.id))
      .for("update");
    const [credential] = await tx
      .select()
      .from(userPasswordCredentials)
      .where(eq(userPasswordCredentials.user_id, row.user.id))
      .for("update");
    if (
      !user ||
      user.status !== "active" ||
      !user.email_verified_at ||
      user.primary_login_method !== "email_password" ||
      !credential ||
      credential.revoked_at !== null ||
      credential.password_hash !== hash
    ) {
      throw invalidLogin();
    }
    if (replacementHash) {
      await tx
        .update(userPasswordCredentials)
        .set({ password_hash: replacementHash, updated_at: new Date() })
        .where(eq(userPasswordCredentials.user_id, user.id));
    }
    return createLogin(tx, user, context);
  });
}
