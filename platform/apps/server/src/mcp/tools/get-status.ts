import type { McpServer } from "@modelcontextprotocol/server";

export function registerStatusTool(server: McpServer): void {
  server.registerTool(
    "get_status",
    {
      description: "Check whether the VibeOnGo MCP server is available.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => ({
      content: [
        {
          type: "text",
          text: "VibeOnGo MCP server is running.",
        },
      ],
    }),
  );
}
