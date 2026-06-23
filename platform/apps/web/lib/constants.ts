export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://server.vibeongo.com";

export const popularOpencodeModels = [
  "openai/gpt-5.4-mini-fast",
  "openai/gpt-5.5",
  "openai/gpt-5.5-fast",
  "openai/gpt-5.5-pro",

  "google/gemini-3-pro-image-preview",
  "google/gemini-3.1-flash-image-preview",
  "google/gemini-3.1-flash-lite",
  "google/gemini-3.1-pro-preview",
  "google/gemini-3.1-pro-preview-customtools",
  "google/gemini-3.5-flash",

  "opencode-go/deepseek-v4-pro",
  "opencode-go/glm-5.1",
  "opencode-go/glm-5.2",
  "opencode-go/kimi-k2.6",
  "opencode-go/kimi-k2.7-code",
  "opencode-go/mimo-v2.5",
  "opencode-go/mimo-v2.5-pro",

  "opencode-go/qwen3.7-max",
  "opencode-go/qwen3.7-plus",
  "opencode/big-pickle",

  "opencode/deepseek-v4-flash-free",
  "opencode/mimo-v2.5-free",
  "opencode/nemotron-3-ultra-free",
  "opencode/north-mini-code-free",
  "opencode-go/deepseek-v4-flash",
  "opencode-go/minimax-m2.7",
  "opencode-go/minimax-m3",
  "opencode-go/qwen3.6-plus",
] as const;
