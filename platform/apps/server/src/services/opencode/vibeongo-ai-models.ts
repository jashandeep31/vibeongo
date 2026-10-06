import { z } from "zod";

export const vibeongoAiModelsSchema = z.record(
  z.string().trim().min(1),
  z.object({
    name: z.string().trim().min(1),
    limit: z
      .object({
        context: z.number().int().positive(),
        output: z.number().int().positive(),
      })
      .optional(),
  }),
);

export type VibeongoAiModels = z.infer<typeof vibeongoAiModelsSchema>;

export const vibeongoAiModels: VibeongoAiModels = {
  "anthropic/claude-sonnet-5.5": {
    name: "Claude Sonnet 5.5",
    limit: { context: 1_000_000, output: 128_000 },
  },
  "anthropic/claude-opus-5.5": {
    name: "Claude Opus 5.5",
    limit: { context: 1_000_000, output: 128_000 },
  },
  "openai/gpt-6.1-sol": {
    name: "GPT-6.1 Sol",
    limit: { context: 1_050_000, output: 128_000 },
  },
  "openai/gpt-6-sol": {
    name: "GPT-6 Sol",
    limit: { context: 1_050_000, output: 128_000 },
  },
  "openai/gpt-6-luna": {
    name: "GPT-6 Luna",
    limit: { context: 1_050_000, output: 128_000 },
  },
  "deepseek/deepseek-v4.1-flash": {
    name: "DeepSeek V4.1 Flash",
    limit: { context: 1_048_576, output: 943_718 },
  },
};
