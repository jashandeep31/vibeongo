import {
  getProxyAuthorizationValue,
  PROXY_AUTHORIZATION_HEADER,
} from "@repo/api-client";

const TOKEN_REQUEST_TIMEOUT_MS = 10_000;
const TERMINAL_CREATION_TIMEOUT_MS = 10_000;

type WebTerminalSocketTokens = {
  proxyToken: string;
  runtimeToken: string;
};

function normalizeRuntimeUrl(runtimeUrl: string) {
  const url = new URL(runtimeUrl);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

async function readToken(response: Response, field: "token" | "vibeongoToken") {
  if (!response.ok) {
    throw new Error((await response.text()) || "Could not authorize socket");
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const token = payload[field];
  if (typeof token !== "string" || !token) {
    throw new Error(`Token response did not contain ${field}`);
  }
  return token;
}

export async function requestWebTerminalSocketTokens({
  accessToken,
  localToken,
  runtimeUrl,
}: {
  accessToken: string;
  localToken: string;
  runtimeUrl: string;
}): Promise<WebTerminalSocketTokens> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TOKEN_REQUEST_TIMEOUT_MS,
  );
  const baseUrl = normalizeRuntimeUrl(runtimeUrl);
  const proxyAuthorization = getProxyAuthorizationValue(accessToken);

  try {
    const [proxyResponse, runtimeResponse] = await Promise.all([
      fetch(`${baseUrl}/proxy/ws-token`, {
        cache: "no-store",
        headers: {
          [PROXY_AUTHORIZATION_HEADER]: proxyAuthorization,
        },
        method: "POST",
        signal: controller.signal,
      }),
      fetch(`${baseUrl}/ws/token`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${localToken}`,
          [PROXY_AUTHORIZATION_HEADER]: proxyAuthorization,
        },
        method: "POST",
        signal: controller.signal,
      }),
    ]);

    const [proxyToken, runtimeToken] = await Promise.all([
      readToken(proxyResponse, "token"),
      readToken(runtimeResponse, "vibeongoToken"),
    ]);
    return { proxyToken, runtimeToken };
  } finally {
    clearTimeout(timeout);
  }
}

export function createWebTerminalSocket({
  path,
  proxyToken,
  runtimeToken,
  runtimeUrl,
  workingDirectory,
}: WebTerminalSocketTokens & {
  path: string;
  runtimeUrl: string;
  workingDirectory?: string;
}) {
  const url = new URL(normalizeRuntimeUrl(runtimeUrl));
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = path;
  url.searchParams.set("proxytoken", proxyToken);
  url.searchParams.set("vibeongoToken", runtimeToken);
  if (workingDirectory) url.searchParams.set("cwd", workingDirectory);
  return new WebSocket(url);
}

export async function createWebTerminalSession({
  accessToken,
  localToken,
  runtimeUrl,
  workingDirectory,
}: {
  accessToken: string;
  localToken: string;
  runtimeUrl: string;
  workingDirectory?: string;
}) {
  const tokens = await requestWebTerminalSocketTokens({
    accessToken,
    localToken,
    runtimeUrl,
  });

  return new Promise<string>((resolve, reject) => {
    const socket = createWebTerminalSocket({
      ...tokens,
      path: "/v2/ws/terminal/new",
      runtimeUrl,
      workingDirectory,
    });
    let settled = false;
    const timeout = setTimeout(() => {
      finish({ error: new Error("Timed out while creating terminal session") });
    }, TERMINAL_CREATION_TIMEOUT_MS);

    const finish = (result: { id: string } | { error: Error }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.close(1000, "Terminal session created");
      if ("id" in result) resolve(result.id);
      else reject(result.error);
    };

    socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      try {
        const message = JSON.parse(event.data) as Record<string, unknown>;
        if (message.type === "session" && typeof message.id === "string") {
          finish({ id: message.id });
        }
      } catch {
        // Terminal output is irrelevant while creating the session.
      }
    };
    socket.onerror = () =>
      finish({ error: new Error("Could not create terminal session") });
    socket.onclose = () => {
      if (!settled) {
        finish({ error: new Error("Terminal connection closed early") });
      }
    };
  });
}

export async function killWebTerminalSession({
  accessToken,
  localToken,
  runtimeUrl,
  terminalId,
}: {
  accessToken: string;
  localToken: string;
  runtimeUrl: string;
  terminalId: string;
}) {
  const tokens = await requestWebTerminalSocketTokens({
    accessToken,
    localToken,
    runtimeUrl,
  });

  return new Promise<void>((resolve, reject) => {
    const socket = createWebTerminalSocket({
      ...tokens,
      path: "/v2/ws",
      runtimeUrl,
    });
    let settled = false;
    const timeout = setTimeout(() => {
      finish(new Error("Timed out while killing terminal session"));
    }, TERMINAL_CREATION_TIMEOUT_MS);

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.close(1000, "Terminal kill request completed");
      if (error) reject(error);
      else resolve();
    };

    socket.onopen = () => {
      try {
        socket.send(JSON.stringify({ type: "killTerminal", id: terminalId }));
      } catch {
        finish(new Error("Could not send terminal kill request"));
      }
    };
    socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      try {
        const message = JSON.parse(event.data) as Record<string, unknown>;
        if (message.id !== terminalId) return;
        if (message.type === "terminalKilled") {
          finish();
        } else if (message.type === "terminalKillError") {
          finish(
            new Error(
              typeof message.error === "string"
                ? message.error
                : "Could not kill terminal session",
            ),
          );
        }
      } catch {
        // Ignore unrelated workspace messages.
      }
    };
    socket.onerror = () =>
      finish(new Error("Could not connect to kill terminal session"));
    socket.onclose = () => {
      if (!settled) finish(new Error("Terminal connection closed early"));
    };
  });
}
