import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { env } from "../../lib/env.js";

export const logout = catchAsync(async (_req: Request, res: Response) => {
  const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  res.clearCookie("session", cookieOptions);

  if (!env.DOMAIN.includes("localhost")) {
    res.clearCookie("session", {
      ...cookieOptions,
      domain: `.${env.DOMAIN}`,
    });
  }

  res.status(200).json({
    message: "Logged out successfully",
  });
});
