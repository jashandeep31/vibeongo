import { db, eq, sessionAuthTokens } from "@repo/db";
import { NextFunction, Request, Response } from "express";

export const checkRuntimeAuthorization = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication is required",
    });
  }

  const token = authHeader.split(" ")[1];
  const sessionId = req.params.id;

  if (!token) {
    return res.status(401).json({
      error: "Authentication is required",
    });
  }

  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({
      error: "Session id is required",
    });
  }

  const [sessionToken] = await db
    .select()
    .from(sessionAuthTokens)
    .where(eq(sessionAuthTokens.token, token));

  if (!sessionToken) {
    return res.status(401).json({
      error: "Invalid API key",
    });
  }

  if (
    sessionToken.expires_at &&
    sessionToken.expires_at.getTime() <= Date.now()
  ) {
    return res.status(401).json({
      error: "API key has expired",
    });
  }

  if (sessionToken.session_id !== sessionId) {
    return res.status(403).json({
      error: "Not authorized",
    });
  }

  next();
};
