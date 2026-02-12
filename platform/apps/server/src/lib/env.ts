import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  AWS_EC2_ACCESS_KEY_ID: z.string(),
  AWS_EC2_ACCESS_KEY_SECRET: z.string(),
  SSH_KEY: z.string(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.log(parsed.error);
  throw new Error("Fix these");
}

export const env = parsed.data;
