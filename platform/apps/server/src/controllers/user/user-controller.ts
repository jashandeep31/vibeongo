import type { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import { PasswordHashBusyError } from "../../lib/password.js";
import { sessionCookieOptions } from "../../lib/session-cookie.js";
import { webSessionMaxAgeMs } from "../../lib/auth-session.js";
import {
  signupWithPassword,
  signinWithPassword,
  toPublicUser,
} from "../../services/auth/password-auth.js";
import type { LoginContext } from "../../services/auth/password-auth.js";
import {
  signupSchema,
  signinSchema,
} from "../../services/auth/password-auth-validation.js";

function context(req: Request): LoginContext {
  const userAgent = req.get("user-agent");
  return {
    ...(req.ip ? { ipAddress: req.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

function sendLogin(
  res: Response,
  result: Awaited<ReturnType<typeof signupWithPassword>>,
  status: 200 | 201,
) {
  res.set("Cache-Control", "no-store");
  res.cookie("session", result.token, {
    ...sessionCookieOptions,
    maxAge: webSessionMaxAgeMs,
  });
  res.status(status).json({ data: toPublicUser(result.user) });
}

async function handleBusy<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof PasswordHashBusyError) {
      throw new AppError(
        "Too many authentication attempts; try again later",
        429,
      );
    }
    if (error instanceof AppError) throw error;
    // Database errors can contain query parameters, including encoded password hashes.
    // Do not pass those errors to the global logger or development error response.
    throw new AppError("Authentication is temporarily unavailable", 500);
  }
}

export const signup = catchAsync(async (req: Request, res: Response) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("Invalid signup details", 400);
  const result = await handleBusy(() =>
    signupWithPassword(parsed.data, context(req)),
  );
  sendLogin(res, result, 201);
});

export const signin = catchAsync(async (req: Request, res: Response) => {
  const parsed = signinSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("Invalid signin details", 400);
  const result = await handleBusy(() =>
    signinWithPassword(parsed.data, context(req)),
  );
  sendLogin(res, result, 200);
});

export const getCurrentUser = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Authentication is required", 401);
    res.set("Cache-Control", "no-store");
    res.status(200).json({ data: toPublicUser(req.user) });
  },
);

// Native clients use the same bearer token contract as GitHub mobile login.
export const mobileSignup = catchAsync(async (req: Request, res: Response) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("Invalid signup details", 400);
  const result = await handleBusy(() =>
    signupWithPassword(parsed.data, { ...context(req), clientType: "mobile" }),
  );
  res
    .set("Cache-Control", "no-store")
    .status(201)
    .json({ token: result.token, data: toPublicUser(result.user) });
});

export const mobileSignin = catchAsync(async (req: Request, res: Response) => {
  const parsed = signinSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("Invalid signin details", 400);
  const result = await handleBusy(() =>
    signinWithPassword(parsed.data, { ...context(req), clientType: "mobile" }),
  );
  res
    .set("Cache-Control", "no-store")
    .status(200)
    .json({ token: result.token, data: toPublicUser(result.user) });
});
