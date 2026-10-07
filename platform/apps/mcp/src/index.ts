import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { env } from "./env.js";
import { mcpHandler } from "./mcp/handlers/mcp-handler.js";

const app = createMcpExpressApp({
  host: env.HOST,
  allowedHosts: env.MCP_ALLOWED_HOSTS,
});
const handleMcpRequest = toNodeHandler(mcpHandler);

app.get("/healthz", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.all("/mcp", (request, response) => {
  void handleMcpRequest(request, response, request.body);
});

const httpServer = app.listen(env.PORT, env.HOST, () => {
  console.log(`Vibeongo MCP server listening on ${env.HOST}:${env.PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void mcpHandler.close().then(() => {
      httpServer.close(() => process.exit(0));
    });
  });
}
