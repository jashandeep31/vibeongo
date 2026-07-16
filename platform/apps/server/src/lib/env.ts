import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number(),
  FRONTEND_URL: z.string(),
  PROXY_DOMAIN: z.string(),
  PROXY_SERVER_TOKEN: z.string().min(1),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BACKEND_URL: z.string(),
  SERVER_URL: z.string(),
  DOMAIN: z.string(),
  AWS_EC2_ACCESS_KEY_ID: z.string(),
  AWS_EC2_ACCESS_KEY_SECRET: z.string(),
  DATABASE_URL: z.string(),
  ALLOWED_ORIGINS: z.string().transform((value) => [
    ...new Set(
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  ]),
  DSN: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  JWT_SECRET: z.string(),
  GITHUB_APP_ID: z.string(),
  GITHUB_WEBHOOK_SECRET: z.string(),
  PROXY_SERVER_URL: z.string(),
  DODO_PAYMENT_PRODUCT_ID: z.string(),
  DODO_PAYMENT_BEARER_TOKEN: z.string(),
  DODO_PAYMENTS_WEBHOOK_SECRET: z.string(),
  PROFIT_PRECENTAGE: z.coerce.number().min(10).max(100),
  AWS_SES_ACCESS_KEY_ID: z.string(),
  AWS_SES_SECRET_KEY: z.string(),
  ENCRYPTION_KEY: z.string(),
  AI_GATEWAY_API_KEY: z.string(),
  DIGITALOCEAN_API_KEY: z.string(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.log(parsed.error);
  throw new Error("Fix these");
}

export const env = parsed.data;
