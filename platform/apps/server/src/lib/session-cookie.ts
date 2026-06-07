import { CookieOptions, Response } from "express";
import { env } from "./env.js";

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV !== "development",
  sameSite: "lax",
  path: "/",
  ...(env.DOMAIN.includes("localhost") ? {} : { domain: `.${env.DOMAIN}` }),
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie("session", sessionCookieOptions);
};
