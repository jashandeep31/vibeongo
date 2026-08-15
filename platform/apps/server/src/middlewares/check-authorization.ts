import { accounts, db, eq, userRoles, users } from "@repo/db";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { clearSessionCookie } from "../lib/session-cookie.js";

const userRolesArray = [...userRoles.enumValues, "all"] as const;
type UserRole = (typeof userRolesArray)[number];

const failedToAuthenticate = (res: Response) => {
  clearSessionCookie(res);
  return res.status(401).json({
    error: "failed to authenticate",
  });
};

export const checkAuthorization = (allowedRoles: UserRole[]) => {
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
  allowedRoles: UserRole[],
) {
  const [scheme, token, ...extraParts] = authorizationHeader.trim().split(/\s+/);

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token ||
    extraParts.length > 0
  ) {
    return failedToAuthenticate(res);
  }

  return authenticateToken(req, res, next, token, allowedRoles);
}

function webBasedAuthenticator(
  req: Request,
  res: Response,
  next: NextFunction,
  token: unknown,
  allowedRoles: UserRole[],
) {
  if (typeof token !== "string") {
    return failedToAuthenticate(res);
  }

  return authenticateToken(req, res, next, token, allowedRoles);
}

async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string,
  allowedRoles: UserRole[],
) {
  let id: string;

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
  } catch {
    return failedToAuthenticate(res);
  }

  const [userAndAccountRow] = await db
    .select({ user: users, account: accounts })
    .from(users)
    .innerJoin(accounts, eq(accounts.user_id, id))
    .where(eq(users.id, id));

  if (!userAndAccountRow?.user || !userAndAccountRow.account) {
    return failedToAuthenticate(res);
  }
  const { user, account } = userAndAccountRow;
  if (account.verified === false) {
    return failedToAuthenticate(res);
  }
  if (account.status !== "active") {
    return failedToAuthenticate(res);
  }

  if (!allowedRoles.includes("all") && !allowedRoles.includes(user.role)) {
    return res.status(403).json({
      error: "not authorized",
    });
  }

  req.user = user;

  next();
}
