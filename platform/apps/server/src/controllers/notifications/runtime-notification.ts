import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { createNotification } from "../../services/notifications/create-notification.js";

// called by the vibeongo server running on the instance (checkRuntimeAuthorization)
export const createRuntimeNotification = catchAsync(
  async (req: Request, res: Response) => {
    const runtimeInstance = req.runtimeInstance;
    if (!runtimeInstance) throw new AppError("Instance not found", 404);

    const { id: sessionId } = z.object({ id: z.string() }).parse(req.params);
    const { type, title, body, url } = z
      .object({
        type: z
          .string()
          .regex(/^[a-z0-9_]+$/)
          .max(64)
          .default("session"),
        title: z.string().trim().min(1).max(200),
        body: z.string().trim().max(1000).optional(),
        // in-app path only, e.g. /projects/:id/sessions/:id/chat
        url: z.string().startsWith("/").max(500).optional(),
      })
      .parse(req.body);

    const sessionUrl = runtimeInstance.project_id
      ? `/projects/${runtimeInstance.project_id}/sessions/${sessionId}/chat`
      : undefined;

    // always the owner of the instance, never taken from the request
    const notification = await createNotification({
      userId: runtimeInstance.user_id,
      type,
      title,
      ...(body ? { body } : {}),
      payload: {
        url: url ?? sessionUrl,
        projectId: runtimeInstance.project_id,
        sessionId,
        instanceId: runtimeInstance.id,
      },
    });

    res.status(201).json({ data: { id: notification.id } });
  },
);
