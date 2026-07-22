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
    await createProjectSessionInstance({
      userId: user.id,
      input,
      assign_domains: true,
    });

    res.status(201).json({
      message: "Successfully had created the project intance",
    });
  },
);
