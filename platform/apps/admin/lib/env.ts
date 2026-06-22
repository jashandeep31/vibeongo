import { z } from "@repo/shared";

const envSchema = z.object({
  AWS_EC2_ACCESS_KEY_ID: z.string(),
  AWS_EC2_ACCESS_KEY_SECRET: z.string(),
});
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.log(parsed.error);
  throw new Error("Fix these");
}

export const env = parsed.data;
