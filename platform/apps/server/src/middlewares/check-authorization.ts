import { db, eq, userRoles, users } from "@repo/db";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { clearSessionCookie } from "../lib/session-cookie.js";

const userRolesArray = [...userRoles.enumValues, "all"] as const;
type userRole = (typeof userRolesArray)[number];

const failedToAuthenticate = (res: Response) => {
  clearSessionCookie(res);
  return res.status(401).json({
    error: "failed to authenticate",
  });
};

export const checkAuthorization = (allowedRoles: userRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { session } = req.cookies;

    if (!session) {
      return failedToAuthenticate(res);
    }

    if (typeof session !== "string") {
      return failedToAuthenticate(res);
    }

    let id: string;

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

    const [user] = await db.select().from(users).where(eq(users.id, id));

    if (!user) {
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
