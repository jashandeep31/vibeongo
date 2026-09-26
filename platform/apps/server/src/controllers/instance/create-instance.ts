import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import { createInstanceSchema } from "@repo/shared";
import { createProjectSessionInstance } from "../../services/instances/create-project-session-instance.js";

export const createInstance = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const input = createInstanceSchema.parse(req.body);
    const { projectSession } = await createProjectSessionInstance({
      userId: user.id,
      input,
      runtime: input.runtime,
      sessionCategory: "auto",
      terminateSetting: "automation",
      assign_domains: true,
    });

    res.status(201).json({
      message: "Automated project session created and instance queued",
      data: { sessionId: projectSession.id },
    });
  },
);
