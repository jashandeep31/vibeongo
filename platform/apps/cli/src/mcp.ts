import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { Effect } from "effect";
import { z } from "zod";
import { createInstanceSchema } from "@repo/shared";
import { createInstance } from "./services/instances.js";
import {
  getProjectOverview,
  getProjectWithDetails,
} from "./services/projects.js";
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

  server.registerTool(
    "getProjectWithDetails",
    {
      description:
        "Get a Vibeongo project's details, repositories, deployment options, and configured settings.",
      inputSchema: z.object({ projectId: z.uuid() }),
    },
    ({ projectId }) =>
      Effect.runPromise(
        getProjectWithDetails(projectId).pipe(
          Effect.match({
            onSuccess: (details) => ({
              content: [
                { type: "text" as const, text: JSON.stringify(details) },
              ],
              structuredContent: details,
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
    "create_instance",
    {
      description:
        "Create an automated project session with repository tasks and queue a paid VM or sandbox instance. Use after the user has approved the project, tasks, and runtime.",
      inputSchema: createInstanceSchema,
    },
    (input) =>
      Effect.runPromise(
        createInstance(input).pipe(
          Effect.match({
            onSuccess: (result) => ({
              content: [
                { type: "text" as const, text: JSON.stringify(result) },
              ],
              structuredContent: result,
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
