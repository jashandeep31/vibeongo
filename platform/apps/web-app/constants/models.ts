export type DefaultModel = {
  id: string;
  name: string;
  provider: string;
};

export const DEFAULT_MODELS: readonly DefaultModel[] = [
  {
    id: "openai/gpt-5.6-luna",
    name: "GPT-5.6 Luna",
    provider: "openai",
  },
  {
    id: "openai/gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    provider: "openai",
  },
  {
    id: "openai/gpt-5.6-terra",
    name: "GPT-5.6 Terra",
    provider: "openai",
  },
  {
    id: "openrouter/z-ai/glm-5.3",
    name: "GLM-5.3",
    provider: "openrouter",
  },
  {
    id: "openrouter/openai/gpt-5.6-luna",
    name: "GPT-5.6 Luna",
    provider: "openrouter",
  },
  {
    id: "openrouter/openai/gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    provider: "openrouter",
  },
  {
    id: "openrouter/openai/gpt-5.6-terra",
    name: "GPT-5.6 Terra",
    provider: "openrouter",
  },
];
