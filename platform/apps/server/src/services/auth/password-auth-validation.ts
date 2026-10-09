import { z } from "zod";

export const normalizeEmail = (email: string) => {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  return trimmed.slice(0, at + 1) + trimmed.slice(at + 1).toLowerCase();
};
const email = z
  .string()
  .trim()
  .max(255)
  .pipe(z.email())
  .transform(normalizeEmail);
const password = z
  .string()
  .max(40)
  .refine((value) => {
    const length = Array.from(value).length;
    return length >= 8 && length <= 20 && !/\s/u.test(value);
  }, "Password must contain 8–20 characters without spaces");

export const signinSchema = z.object({ email, password });
export const signupSchema = signinSchema.extend({
  firstName: z.string().trim().min(1).max(100),
});
export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
