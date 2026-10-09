import type { Request, Response } from "express";
import { z } from "zod";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/app-error.js";
import { PasswordHashBusyError } from "../../lib/password.js";
import {
  emailSchema,
  passwordSchema,
} from "../../services/auth/password-auth-validation.js";
import {
  consumeEmailOtp,
  forgotPassword as requestPasswordReset,
  resendVerification as resend,
} from "../../services/auth/email-otp.js";

const emailInput = z.object({ email: emailSchema });
const challengeInput = emailInput.extend({ challengeId: z.uuid() });
const verifyInput = challengeInput.extend({ otp: z.string().regex(/^\d{6}$/) });
const resetInput = verifyInput.extend({ newPassword: passwordSchema });

function handler<T>(
  schema: z.ZodType<T>,
  operation: (input: T) => Promise<unknown>,
  status: number,
) {
  return catchAsync(async (req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError("Invalid authentication details", 400);
    try {
      const result = await operation(parsed.data);
      res.status(status).json({ data: result });
    } catch (error) {
      if (error instanceof PasswordHashBusyError)
        throw new AppError(
          "Too many authentication attempts; try again later",
          429,
        );
      if (error instanceof AppError) {
        if (error.status === 429) res.set("Retry-After", "60");
        throw error;
      }
      // Never expose database/SES errors containing hashes or codes.
      throw new AppError("Authentication is temporarily unavailable", 503, {
        reportToSentry: false,
      });
    }
  });
}

export const verifyEmail = handler(
  verifyInput,
  async (input) => {
    await consumeEmailOtp(input, "signup_verification");
    return {
      emailVerified: true,
      message: "Email verified. You can now sign in.",
    };
  },
  200,
);
export const resendVerification = handler(
  challengeInput,
  (input) => resend(input.email, input.challengeId),
  202,
);
export const forgotPassword = handler(
  emailInput,
  async (input) => ({
    ...(await requestPasswordReset(input.email)),
    message:
      "If this account is eligible, a password reset code has been sent.",
  }),
  202,
);
export const resetPassword = handler(
  resetInput,
  async (input) => {
    await consumeEmailOtp(input, "password_reset");
    return { message: "Password updated. Please sign in again." };
  },
  200,
);
