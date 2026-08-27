type ReactNativeWebSocketConstructor = new (
  url: string,
  protocols?: string[],
  options?: { headers?: Record<string, string> },
) => WebSocket;

const TOKEN_REQUEST_TIMEOUT_MS = 10_000;

function getRuntimeUrl(runtimeUrl: string) {
  const url = new URL(runtimeUrl);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function createVibeongoWsV2Socket({
  accessToken,
  path,
  runtimeUrl,
  token,
  workingDirectory,
}: {
  accessToken: string;
  path: string;
  runtimeUrl: string;
  token: string;
  workingDirectory?: string;
}) {
  const url = new URL(getRuntimeUrl(runtimeUrl));
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = path;
  url.searchParams.set("vibeongoToken", token);
  if (workingDirectory) url.searchParams.set("cwd", workingDirectory);

  const NativeWebSocket =
    WebSocket as unknown as ReactNativeWebSocketConstructor;
  return new NativeWebSocket(url.toString(), [], {
    headers: {
      "X-Vibeongo-Proxy-Authorization": `Bearer ${accessToken}`,
    },
  });
}

export async function requestVibeongoWsV2Token({
  accessToken,
  localToken,
  runtimeUrl,
}: {
  accessToken: string;
  localToken: string;
  runtimeUrl: string;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TOKEN_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${getRuntimeUrl(runtimeUrl)}/ws/token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localToken}`,
        "X-Vibeongo-Proxy-Authorization": `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error((await response.text()) || "Could not authorize socket");
    }

    const payload = (await response.json()) as { vibeongoToken?: unknown };
    if (typeof payload.vibeongoToken !== "string" || !payload.vibeongoToken) {
      throw new Error("Runtime returned an invalid WebSocket token");
    }
    return payload.vibeongoToken;
  } finally {
    clearTimeout(timeout);
  }
}
