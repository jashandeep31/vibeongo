import { McpServer } from "@modelcontextprotocol/server";
import type { users } from "@repo/db";
import { registerCurrentUserTool } from "./tools/get-current-user.js";

export type McpUser = typeof users.$inferSelect;

// Each HTTP request gets its own instance; never store caller state globally.
export function createMcpServer(user?: McpUser): McpServer {
  if (!user) throw new Error("Authentication is required");
  const server = new McpServer({
    name: "vibeongo-mcp",
    version: "0.0.1",
  });

  registerCurrentUserTool(server, user);
  return server;
}
