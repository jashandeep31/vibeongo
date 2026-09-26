import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { Effect } from "effect";
import { z } from "zod";
import { getWalletBalance } from "./services/wallet.js";

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({ name: "vibeongo", version: "0.1.0" });

  server.registerTool(
    "wallet",
    {
      description: "Get the current Vibeongo account wallet balance.",
      inputSchema: z.object({}),
    },
    () =>
      Effect.runPromise(
        getWalletBalance().pipe(
          Effect.match({
            onSuccess: (balance) => ({
              content: [{ type: "text" as const, text: balance }],
            }),
            onFailure: (error) => ({
              isError: true,
              content: [{ type: "text" as const, text: error.message }],
            }),
          }),
        ),
      ),
  );

  await server.connect(new StdioServerTransport());
}
