import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { Effect } from "effect";
import { z } from "zod";
import { getProjectOverview } from "./services/projects.js";
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

  server.registerTool(
    "list_projects",
    {
      description:
        "List Vibeongo projects with active sessions and running instances. Results are paginated by project.",
      inputSchema: z.object({
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(20).optional(),
      }),
    },
    (params) =>
      Effect.runPromise(
        getProjectOverview(params).pipe(
          Effect.match({
            onSuccess: (overview) => ({
              content: [
                { type: "text" as const, text: JSON.stringify(overview) },
              ],
              structuredContent: overview,
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
