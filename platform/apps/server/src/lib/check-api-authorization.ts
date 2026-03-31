import { db, eq, userRoles, users, authTokens } from "@repo/db";
import { NextFunction, Request, Response } from "express";
import * as crypto from "crypto";

const userRolesArray = [...userRoles.enumValues, "all"] as const;
type userRole = (typeof userRolesArray)[number];

export const checkApiAuthorization = (allowedRoles: userRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication is required",
      });
    }

    const apiKey = authHeader.split(" ")[1];

    if (!apiKey) {
      return res.status(401).json({
        error: "Authentication is required",
      });
    }

    const hashedKey = crypto.createHash("sha256").update(apiKey).digest("hex");

    const [token] = await db
      .select()
      .from(authTokens)
      .where(eq(authTokens.secret, hashedKey));

    if (!token) {
      return res.status(401).json({
        error: "Invalid API key",
      });
    }

    if (token.terminated_at) {
      return res.status(401).json({
        error: "API key is revoked",
      });
    }

    if (!token.user_id) {
      return res.status(401).json({
        error: "Invalid token mapping",
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, token.user_id));

    if (!user) {
      return res.status(401).json({
        error: "User not found",
      });
    }

    if (!allowedRoles.includes("all") && !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: "Not authorized",
      });
    }

    req.user = user;

    next();
  };
};
