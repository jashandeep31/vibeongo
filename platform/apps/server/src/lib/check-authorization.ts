import { db, eq, userRoles, users } from "@repo/db";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "./env.js";

const userRolesArray = [...userRoles.enumValues, "all"] as const;
type userRole = (typeof userRolesArray)[number];

export const checkAuthorization = (allowedRoles: userRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { session } = req.cookies;

    if (!session) {
      return res.status(401).json({
        error: "failed to authenticate",
      });
    }

    if (typeof session !== "string") {
      return res.status(401).json({
        error: "failed to authenticate",
      });
    }

    let id: string;

    try {
      const decoded = jwt.verify(session, env.JWT_SECRET);

      if (
        typeof decoded !== "object" ||
        decoded === null ||
        typeof decoded.id !== "string"
      ) {
        return res.status(401).json({
          error: "failed to authenticate",
        });
      }

      id = decoded.id;
    } catch {
      return res.status(401).json({
        error: "failed to authenticate",
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, id));

    if (!user) {
      return res.status(401).json({
        error: "failed to authenticate",
      });
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
