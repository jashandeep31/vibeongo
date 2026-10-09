import {
  accounts,
  and,
  db,
  eq,
  gt,
  isNull,
  or,
  USER_API_KEY_PREFIX,
  userRoles,
  users,
  usersApiKeys,
} from "@repo/db";
import { createHash } from "node:crypto";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { clearSessionCookie } from "../lib/session-cookie.js";
import { findWebSession } from "../lib/auth-session.js";

type AllowedCredential = (typeof userRoles.enumValues)[number] | "api_key";

const failedToAuthenticate = (res: Response) => {
  clearSessionCookie(res);
  return res.status(401).json({
    error: "failed to authenticate",
  });
};

export const checkAuthorization = (allowedRoles: AllowedCredential[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const sessionToken: unknown = req.cookies?.session;
    const authorizationHeader = req.get("authorization");

    if (authorizationHeader) {
      return appBasedAuthenticator(
        req,
        res,
        next,
        authorizationHeader,
        allowedRoles,
      );
    }

    if (sessionToken) {
      return webBasedAuthenticator(req, res, next, sessionToken, allowedRoles);
    }

    return failedToAuthenticate(res);
  };
};

function appBasedAuthenticator(
  req: Request,
  res: Response,
  next: NextFunction,
  authorizationHeader: string,
  allowedRoles: AllowedCredential[],
) {
  const [scheme, token, ...extraParts] = authorizationHeader
    .trim()
    .split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || extraParts.length > 0) {
    return failedToAuthenticate(res);
  }

  if (token.startsWith(USER_API_KEY_PREFIX)) {
    return authenticateApiKey(req, res, next, token, allowedRoles);
  }

  return authenticateToken(req, res, next, token, allowedRoles);
}

async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string,
  allowedRoles: AllowedCredential[],
) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();

  const [apiKey] = await db
    .update(usersApiKeys)
    .set({ last_used_at: now })
    .where(
      and(
        eq(usersApiKeys.key_hash, tokenHash),
        isNull(usersApiKeys.revoked_at),
        or(isNull(usersApiKeys.expires_at), gt(usersApiKeys.expires_at, now)),
      ),
    )
    .returning({ userId: usersApiKeys.user_id });

  if (!apiKey) return failedToAuthenticate(res);

  if (!allowedRoles.includes("api_key")) {
    return res.status(403).json({ error: "not authorized" });
  }

  const user = await findAuthorizedUser(apiKey.userId);
  if (!user) return failedToAuthenticate(res);
  req.user = user;
  next();
}

async function authenticateWebSessionOrLegacyJwt(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string,
  allowedRoles: AllowedCredential[],
) {
  const session = await findWebSession(token);
  if (session) {
    return authenticateUser(req, res, next, session.user_id, allowedRoles);
  }

  // Preserve legacy JWT-cookie authentication during the migration.
  return authenticateToken(req, res, next, token, allowedRoles);
}

function webBasedAuthenticator(
  req: Request,
  res: Response,
  next: NextFunction,
  token: unknown,
  allowedRoles: AllowedCredential[],
) {
  if (typeof token !== "string") {
    return failedToAuthenticate(res);
  }

  return authenticateWebSessionOrLegacyJwt(req, res, next, token, allowedRoles);
}

async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string,
  allowedRoles: AllowedCredential[],
) {
  let id: string;
  let authVersion: number;

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.id !== "string"
    ) {
      return failedToAuthenticate(res);
    }

    id = decoded.id;
    authVersion = decoded.authVersion === undefined ? 0 : decoded.authVersion;
    if (!Number.isInteger(authVersion) || authVersion < 0)
      return failedToAuthenticate(res);
  } catch {
    return failedToAuthenticate(res);
  }

  return authenticateUser(req, res, next, id, allowedRoles, authVersion);
}

async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction,
  id: string,
  allowedRoles: AllowedCredential[],
  authVersion?: number,
) {
  const user = await findAuthorizedUser(id);
  if (!user || (authVersion !== undefined && user.auth_version !== authVersion))
    return failedToAuthenticate(res);

  if (user.role !== "admin" && !allowedRoles.includes(user.role)) {
    return res.status(403).json({ error: "not authorized" });
  }

  req.user = user;
  next();
}

export async function findAuthorizedUser(id: string) {
  const [row] = await db
    .select({ user: users, account: accounts })
    .from(users)
    .leftJoin(
      accounts,
      and(eq(accounts.user_id, users.id), eq(accounts.provider, "github")),
    )
    .where(eq(users.id, id))
    .limit(1);
  if (!row || row.user.status !== "active") return undefined;
  if (
    row.user.primary_login_method === "email_password" &&
    !row.user.email_verified_at
  )
    return undefined;
  // Preserve legacy GitHub restrictions without requiring a provider for email users.
  if (
    row.account &&
    (row.account.status !== "active" ||
      !row.account.verified ||
      row.account.deleted_at)
  ) {
    return undefined;
  }
  if (row.user.primary_login_method === "github" && !row.account)
    return undefined;
  return row.user;
}
