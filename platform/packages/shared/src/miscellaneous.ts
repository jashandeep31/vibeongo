import { z } from "zod";

export const createSshKeySchema = z.object({
  name: z.string().max(100),
  value: z.string().max(300),
});

export const createAuthTokenSchema = z.object({
  name: z.string().max(255).min(3),
  permission: z.enum(["read", "write"]),
});
