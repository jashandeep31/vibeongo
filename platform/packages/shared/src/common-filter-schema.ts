import { z } from "zod";

export const commonFilterSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  query: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(10),
});
