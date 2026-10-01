import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { resumeSuspendedSession } from "../../services/instances/resume-suspended-session.js";

export const resumeSuspendedProjectSession = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const { id } = z.object({ id: z.uuid() }).parse(req.params);

    await resumeSuspendedSession({ sessionId: id, userId: user.id });

    res.status(200).json({
      message: "Session resumed. Its runtime is restarting in the background.",
    });
  },
);
