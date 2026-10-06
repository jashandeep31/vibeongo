// Suggested model IDs. Keep in sync with web-app/constants/models.ts.
export type DefaultModel = {
  id: string;
  provider: string;
};

export const DEFAULT_MODELS: readonly DefaultModel[] = [
  {
    id: "openai/gpt-5.6-luna",
    provider: "openai",
  },
  {
    id: "openai/gpt-5.6-sol",
    provider: "openai",
  },
  {
    id: "openai/gpt-5.6-terra",
    provider: "openai",
  },
  {
    id: "openrouter/z-ai/glm-5.3",
    provider: "openrouter",
  },
  {
    id: "openrouter/openai/gpt-5.6-luna",
    provider: "openrouter",
  },
  {
    id: "openrouter/openai/gpt-5.6-sol",
    provider: "openrouter",
  },
  {
    id: "openrouter/openai/gpt-5.6-terra",
    provider: "openrouter",
  },
];
