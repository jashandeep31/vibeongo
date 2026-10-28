import { McpServer } from "@modelcontextprotocol/server";
import { registerStatusTool } from "./tools/get-status.js";

// Each HTTP request gets its own instance; never store caller state globally.
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "vibeongo-mcp",
    version: "0.0.1",
  });

  registerStatusTool(server);
  return server;
}
