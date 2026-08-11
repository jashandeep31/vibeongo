import { accounts, db, eq, userRoles, users } from "@repo/db";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { clearSessionCookie } from "../lib/session-cookie.js";

const userRolesArray = [...userRoles.enumValues, "all"] as const;
type userRole = (typeof userRolesArray)[number];
const developmentUserId = "634c805d-c70a-4333-9214-65d3fafc9481";

const failedToAuthenticate = (res: Response) => {
  clearSessionCookie(res);
  return res.status(401).json({
    error: "failed to authenticate",
  });
};

export const checkAuthorization = (allowedRoles: userRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.get("authorization");
    const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
    const session = bearerMatch?.[1]?.trim() || req.cookies?.session;
    const requestedDevelopmentUserId = req.get("x-development-user-id");
    const isDevelopmentIdentity =
      env.NODE_ENV === "development" &&
      requestedDevelopmentUserId === developmentUserId;

    let id: string;

    if (isDevelopmentIdentity) {
      id = developmentUserId;
    } else {
      if (!session || typeof session !== "string") {
        return failedToAuthenticate(res);
      }

      try {
        const decoded = jwt.verify(session, env.JWT_SECRET);

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
    }

    if (isDevelopmentIdentity) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) return failedToAuthenticate(res);

      if (!allowedRoles.includes("all") && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "not authorized" });
      }

      req.user = user;
      next();
      return;
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
  };
};
