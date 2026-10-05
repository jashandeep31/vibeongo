import { db, eq, projectSessions, projects } from "@repo/db";
import { Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { getChatgptAccessToken } from "../../services/user-config/get-chatgpt-access-token.js";

export const getProviderAccessToken = catchAsync(
  async (req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");
    const runtime = req.runtimeInstance;
    if (!runtime || runtime.project_session_id !== req.params.id) {
      throw new AppError("Runtime authentication is required", 401);
    }
    if (req.params.provider !== "codex") {
      throw new AppError("Unsupported provider. Only codex is supported", 400);
    }

    // Resolve ownership from the authenticated runtime, never from request input.
    const [session] = await db
      .select({ userId: projects.user_id })
      .from(projectSessions)
      .innerJoin(projects, eq(projects.id, projectSessions.project_id))
      .where(eq(projectSessions.id, runtime.project_session_id));
    if (!session) throw new AppError("Project session not found", 404);

    const token = await getChatgptAccessToken(session.userId);
    res.status(200).json({
      data: {
        access_token: token.access_token,
        access_token_expires_at: token.access_token_expires_at,
      },
    });
  },
);
