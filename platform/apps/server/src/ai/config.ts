import { GoogleGenAI } from "@google/genai";
import { env } from "../lib/env.js";

export const googleAiClient = new GoogleGenAI({
  apiKey: env.GOOGLE_GEN_AI_API,
});

export const aiModels = {
  "google-large-model": {
    name: "gemini-3-flash-preview",
    inputTokensCostPerMil: 0,
    outputTokensCostPerMil: 0,
  },
  "google-lite-model": {
    name: "gemini-3-flash-preview",
    inputTokensCostPerMil: 0,
    outputTokensCostPerMil: 0,
  },
} as const;
