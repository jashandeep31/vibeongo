import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { clearSessionCookie } from "../../lib/session-cookie.js";

export const logout = catchAsync(async (_req: Request, res: Response) => {
  clearSessionCookie(res);

  res.status(200).json({
    message: "Logged out successfully",
  });
});
