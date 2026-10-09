import { createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "../lib/env.js";
import { redis } from "../lib/valkey.js";
import { AppError } from "../lib/app-error.js";
import { catchAsync } from "../lib/catch-async.js";

export function requireTrustedAuthOrigin(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const origin = req.get("origin");
  if (!origin || !env.ALLOWED_ORIGINS.includes(origin)) {
    return next(new AppError("Untrusted authentication origin", 403));
  }
  next();
}

const windowSeconds = 15 * 60;
const increment = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('TTL', KEYS[1])}
`;

function rateLimit(action: "signup" | "signin", max: number) {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    res.set("Cache-Control", "no-store");
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const identifiers = [`ip:${ip}`];
    if (action === "signin" && typeof req.body?.email === "string") {
      identifiers.push(`email:${req.body.email.trim().toLowerCase()}`);
    }
    for (const identifier of identifiers) {
      const digest = createHash("sha256").update(identifier).digest("hex");
      let result: unknown;
      try {
        result = await redis.eval(
          increment,
          1,
          `password-auth:${action}:${digest}`,
          windowSeconds,
        );
      } catch {
        throw new AppError("Authentication is temporarily unavailable", 503);
      }
      const [count, ttl] = result as [number, number];
      if (Number(count) > max) {
        res.set("Retry-After", String(Math.max(1, Number(ttl))));
        throw new AppError(
          "Too many authentication attempts; try again later",
          429,
        );
      }
    }
    next();
  });
}

export const signupRateLimit = rateLimit("signup", 5);
export const signinRateLimit = rateLimit("signin", 20);

// Native requests have no Origin. Browser requests must still come from our apps.
export function requireTrustedMobileAuthOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.get("origin")) return requireTrustedAuthOrigin(req, res, next);
  next();
}
