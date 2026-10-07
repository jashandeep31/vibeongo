import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const envSchema = z.object({
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8004),
  MCP_ALLOWED_HOSTS: z
    .string()
    .default("localhost,127.0.0.1")
    .transform((value) =>
      [...new Set(value.split(",").map((host) => host.trim()).filter(Boolean))],
    ),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error);
  throw new Error("Fix the MCP environment variables.");
}

export const env = parsed.data;
