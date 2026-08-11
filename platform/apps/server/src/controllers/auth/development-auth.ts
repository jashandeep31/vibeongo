import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { env } from "../../lib/env.js";

const DEVELOPMENT_USER_ID = "634c805d-c70a-4333-9214-65d3fafc9481";

export const developmentAuth = catchAsync(
  async (_req: Request, res: Response) => {
    if (env.NODE_ENV !== "development") {
      throw new AppError("Not found", 404);
    }

    const token = jwt.sign({ id: DEVELOPMENT_USER_ID }, env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(200).json({
      data: {
        token,
        user: {
          id: DEVELOPMENT_USER_ID,
          email: "jashandeep1659@gmail.com",
          username: "jashandeep31",
          firstName: "Jashandeep",
          lastName: "Singh",
          role: "admin",
        },
      },
    });
  },
);
