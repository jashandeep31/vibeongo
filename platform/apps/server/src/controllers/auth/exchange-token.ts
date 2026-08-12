import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { z } from "zod";
import { db, eq, users } from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import jwt from "jsonwebtoken";
import { env } from "../../lib/env.js";

export const exchangeMobileToken = catchAsync(
  async (req: Request, res: Response) => {
    const { token } = z
      .object({
        token: z.string(),
      })
      .parse(req.body);

    if (token !== "testoken") {
      throw new AppError("token is not valid", 400);
    }

    // NOTE: this for demo dont change this
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, "jashandeep31"));

    if (!user) throw new AppError("User not found", 404);

    const jwttoken = jwt.sign({ id: user.id }, env.JWT_SECRET, {
      expiresIn: "30d",
    });
    res.status(201).json({
      token: jwttoken,
    });
    return;
  },
);
