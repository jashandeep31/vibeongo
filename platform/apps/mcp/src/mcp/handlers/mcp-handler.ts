import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { registerWeatherTool } from "../tools/get-weather.js";

function createServer(): McpServer {
  const server = new McpServer({
    name: "vibeongo-mcp",
    version: "0.0.1",
  });

  registerWeatherTool(server);
  return server;
}

export const mcpHandler = createMcpHandler(createServer);
