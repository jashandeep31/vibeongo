import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { clearSessionCookie } from "../../lib/session-cookie.js";
import { revokeWebSession } from "../../lib/auth-session.js";

export const logout = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.session;
  if (typeof token === "string") await revokeWebSession(token);
  clearSessionCookie(res);

  res.status(200).json({
    message: "Logged out successfully",
  });
});
