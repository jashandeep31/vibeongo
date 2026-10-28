import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { Router } from "express";
import { createMcpServer } from "./create-server.js";

export const mcpHandler = createMcpHandler(createMcpServer);
const handleMcpRequest = toNodeHandler(mcpHandler);

export function createMcpRouter(allowedOrigins: readonly string[]): Router {
  const router = Router();
  const origins = new Set(allowedOrigins);

  router.all("/", async (request, response) => {
    // CORS alone does not reject requests. Cloud clients without Origin pass.
    const origin = request.headers.origin;
    if (origin !== undefined && !origins.has(origin)) {
      response.status(403).json({ message: "Origin not allowed" });
      return;
    }

    // Express has already consumed the JSON stream; forward its parsed body.
    await handleMcpRequest(request, response, request.body);
  });

  return router;
}
