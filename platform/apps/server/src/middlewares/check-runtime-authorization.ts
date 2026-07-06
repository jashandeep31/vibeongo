import { and, db, eq, instances, sql } from "@repo/db";
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

  const token = authHeader.slice("Bearer ".length).trim();
  const sessionId = req.params.id;
  const instanceId = req.params.instanceId;

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

  const [runtimeInstance] = await db
    .select()
    .from(instances)
    .where(
      and(
        eq(instances.project_session_id, sessionId),
        eq(instances.state, "running"),
        sql`${instances.config}->>'sessionToken' = ${token}`,
      ),
    );

  if (!runtimeInstance) {
    return res.status(401).json({
      error: "Invalid API key",
    });
  }

  if (
    instanceId &&
    typeof instanceId === "string" &&
    runtimeInstance.id !== instanceId
  ) {
    return res.status(403).json({
      error: "Not authorized",
    });
  }

  req.runtimeInstance = runtimeInstance;
  next();
};
