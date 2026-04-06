import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";

export const getUserMetadata = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("authentication is required", 401);
    res.status(200).json({
      id: user.id,
    });
  },
);
