import { Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";

export const getAuthSession = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Authentication is required", 401);

    res.status(200).json({
      data: {
        id: req.user.id,
        username: req.user.username,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
      },
    });
  },
);
