import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";
import { setForgejoUserPassword } from "../../services/forgejo/set-user-password.js";

const setForgejoPasswordSchema = z.object({
  password: z
    .string()
    .min(4, "Password must be at least 4 characters")
    .max(20, "Password must be at most 20 characters"),
});

export const setForgejoPassword = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authentication is required", 401);

    const { password } = setForgejoPasswordSchema.parse(req.body);
    await setForgejoUserPassword(user, password);

    res.status(200).json({
      message: "Forgejo password updated successfully",
    });
  },
);
