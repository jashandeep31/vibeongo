import { Type } from "@google/genai";
import { aiModels, googleAiClient } from "../config.js";
import { prompts } from "../prompts/index.js";

export const getSessionNameAndDescription = async (content: string) => {
  try {
    const res = await googleAiClient.models.generateContent({
      model: aiModels["google-lite-model"].name,
      config: {
        systemInstruction: prompts.getSessionNameAndDescription.systemPrompt(),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["name", "description"],
          properties: {
            name: {
              type: Type.STRING,
            },
            description: {
              type: Type.STRING,
            },
          },
        },
      },
      contents: [{ role: "user", parts: [{ text: content }] }],
    });

    const parsedResponse = JSON.parse(res.text || "");

    return parsedResponse as {
      name: string;
      description: string;
    };
  } catch {
    return {
      name: "Unkown",
      description: content,
    };
  }
};
