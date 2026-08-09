import { z } from "zod";

export const chatQuestionPayloadSchema = z
  .object({
    mentions: z
      .array(
        z.object({
          type: z.literal("project"),
          id: z.string().min(1),
          name: z.string().trim().min(1).max(255),
        }),
      )
      .max(20)
      .default([]),
  })
  .default({ mentions: [] });
