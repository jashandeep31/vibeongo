import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { renderCallbackPage } from "./oauth-callback-page.js";

export function sendCallbackMessage(
  response: ServerResponse,
  status: number,
  message: string,
) {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    Connection: "close",
  });
  response.end(renderCallbackPage(status, message));
}

export async function startOAuthCallback(state: string, signal: AbortSignal) {
  let settled = false;
  let resolveCallback!: (result: {
    params: URLSearchParams;
    response: ServerResponse;
  }) => void;
  let rejectCallback!: (error: Error) => void;
  const callback = new Promise<{
    params: URLSearchParams;
    response: ServerResponse;
  }>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });
  // Keep cancellations handled while browser opening is still in progress.
  void callback.catch(() => {});
  const server = createServer((request, response) => {
    let url: URL;
    try {
      url = new URL(request.url ?? "/", "http://127.0.0.1");
    } catch {
      sendCallbackMessage(response, 400, "Invalid callback URL.");
      return;
    }
    if (request.method !== "GET" || url.pathname !== "/auth/callback") {
      sendCallbackMessage(response, 404, "Not found.");
      return;
    }
    if (settled) {
      sendCallbackMessage(
        response,
        409,
        "This sign-in callback has already been received.",
      );
      return;
    }
    if (
      url.searchParams.getAll("state").length !== 1 ||
      url.searchParams.get("state") !== state
    ) {
      sendCallbackMessage(
        response,
        400,
        "Invalid sign-in state. Use the current browser sign-in link.",
      );
      return;
    }
    settled = true;
    resolveCallback({ params: url.searchParams, response });
  });
  const onAbort = () => {
    settled = true;
    rejectCallback(new Error("ChatGPT sign-in cancelled or timed out."));
    server.close();
    server.closeAllConnections();
  };
  signal.addEventListener("abort", onAbort, { once: true });
  server.on("error", (error) => {
    if (server.listening && !settled) rejectCallback(error);
  });

  try {
    for (let port = 3102; port <= 65535; port += 1) {
      signal.throwIfAborted();
      try {
        await new Promise<void>((resolve, reject) => {
          const onError = (error: Error) => {
            server.removeListener("listening", onListening);
            reject(error);
          };
          const onListening = () => {
            server.removeListener("error", onError);
            resolve();
          };
          server.once("error", onError);
          server.once("listening", onListening);
          server.listen(port, "127.0.0.1");
        });
        const selectedPort = (server.address() as AddressInfo).port;
        return {
          redirectUri: `http://127.0.0.1:${selectedPort}/auth/callback`,
          callback,
          close: () => {
            signal.removeEventListener("abort", onAbort);
            server.close();
            server.closeIdleConnections();
          },
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") throw error;
      }
    }
    throw new Error("No available port found for the ChatGPT callback.");
  } catch (error) {
    signal.removeEventListener("abort", onAbort);
    server.close();
    throw error;
  }
}
