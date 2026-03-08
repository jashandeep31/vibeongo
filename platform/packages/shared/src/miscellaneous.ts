import { z } from "zod";

export const createSshKeySchema = z.object({
  name: z.string().max(100),
  value: z.string().max(300),
});
