import { AppError } from "../../lib/appError.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";

export const createGithubRepo = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    res.status(201).json({
      message: "Successfully had created the project intance",
    });
  },
);
