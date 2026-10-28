import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, type AuthInfo } from "@modelcontextprotocol/server";
import { Router, type RequestHandler } from "express";
import { createMcpServer, type McpUser } from "./create-server.js";

export const mcpHandler = createMcpHandler(({ authInfo }) =>
  createMcpServer(authInfo?.extra?.user as McpUser | undefined),
);
const handleMcpRequest = toNodeHandler({
  async fetch(request, options) {
    const response = await mcpHandler.fetch(request, options);
    // Override the transport's cache policy for account data and SSH credentials.
    response.headers.set("Cache-Control", "no-store, no-transform");
    return response;
  },
});

export function createMcpRouter(
  allowedOrigins: readonly string[],
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const origins = new Set(allowedOrigins);

  router.use((request, response, next) => {
    // CORS alone does not reject requests. Cloud clients without Origin pass.
    const origin = request.headers.origin;
    if (origin !== undefined && !origins.has(origin)) {
      response.status(403).json({ message: "Origin not allowed" });
      return;
    }

    next();
  });

  router.all("/", authenticate, async (request, response) => {
    if (!request.user) {
      response.status(401).json({ message: "Authentication is required" });
      return;
    }

    response.set("Cache-Control", "no-store");

    // The Node adapter forwards verified caller context into this request's factory.
    const authenticatedRequest = Object.assign(request, {
      auth: {
        token: request.get("authorization")?.trim().split(/\s+/)[1] ?? "",
        clientId: "vibeongo-api-key",
        scopes: [],
        extra: { user: request.user },
      } satisfies AuthInfo,
    });
    // Express has already consumed the JSON stream; forward its parsed body.
    await handleMcpRequest(authenticatedRequest, response, request.body);
  });

  return router;
}
