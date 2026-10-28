import { AppError } from "../lib/app-error.js";

export async function toolResult(
  action: () => Promise<Record<string, unknown>>,
) {
  try {
    // Serialize dates consistently for both text and structured MCP clients.
    const text = JSON.stringify(await action());
    return {
      content: [{ type: "text" as const, text }],
      structuredContent: JSON.parse(text) as Record<string, unknown>,
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text:
            error instanceof AppError && error.status < 500
              ? error.message
              : "The operation failed. Please try again.",
        },
      ],
    };
  }
}
