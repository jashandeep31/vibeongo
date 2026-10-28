import { McpServer } from "@modelcontextprotocol/server";
import type { users } from "@repo/db";
import { registerCurrentUserTool } from "./tools/get-current-user.js";
import { registerCreateSessionTool } from "./tools/create-session.js";
import { registerProjectsTool } from "./tools/get-projects.js";
import { registerSshTools } from "./tools/ssh-access.js";
import {
  registerWorkspaceGuide,
  WORKSPACE_REMINDER,
} from "./workspace-guide.js";

export type McpUser = typeof users.$inferSelect;

// Each HTTP request gets its own instance; never store caller state globally.
export function createMcpServer(user?: McpUser): McpServer {
  if (!user) throw new Error("Authentication is required");
  const server = new McpServer(
    { name: "vibeongo-mcp", version: "0.0.1" },
    { instructions: WORKSPACE_REMINDER },
  );

  registerWorkspaceGuide(server);
  registerCurrentUserTool(server, user);
  registerProjectsTool(server, user);
  registerCreateSessionTool(server, user);
  registerSshTools(server, user);
  return server;
}
