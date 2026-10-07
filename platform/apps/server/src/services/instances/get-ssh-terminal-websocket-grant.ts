import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { getProxyServerUrl } from "../../lib/proxy-servers.js";

const PROXY_AUTHORIZATION_HEADER = "X-Vibeongo-Proxy-Authorization";
const RUNTIME_PORT = 3101;
const TOKEN_REQUEST_TIMEOUT_MS = 10_000;

const proxyTokenResponse = z.object({
  token: z.string().min(1),
  expiresAt: z.iso.datetime(),
});
const runtimeTokenResponse = z.object({
  vibeongoToken: z.string().min(1),
  expiresAt: z.iso.datetime(),
});

export async function getSshTerminalWebSocketGrant({
  instanceId,
  projectId,
  proxyAccessToken,
  runtimeLocalToken,
}: {
  instanceId: string;
  projectId: string;
  proxyAccessToken: string;
  runtimeLocalToken: string;
}) {
  // The suffix comes from the proxy's regional configuration. The stored
  // instances.proxy_domain value is not used to construct this static host.
  const proxyDomain = await getProxyServerUrl(projectId);
  const runtimeOrigin = `https://${RUNTIME_PORT}-${instanceId}${proxyDomain}`;
  const proxyAuthorization = `Bearer ${proxyAccessToken}`;

  let proxyResponse: Response;
  let runtimeResponse: Response;
  try {
    [proxyResponse, runtimeResponse] = await Promise.all([
      fetch(`${runtimeOrigin}/proxy/ws-token`, {
        method: "POST",
        headers: { [PROXY_AUTHORIZATION_HEADER]: proxyAuthorization },
        cache: "no-store",
        signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
      }),
      fetch(`${runtimeOrigin}/ws/token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${runtimeLocalToken}`,
          [PROXY_AUTHORIZATION_HEADER]: proxyAuthorization,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
      }),
    ]);
  } catch {
    throw new AppError("Could not reach the SSH terminal runtime", 502);
  }

  if (!proxyResponse.ok || !runtimeResponse.ok) {
    throw new AppError("Could not authorize the SSH terminal", 502);
  }

  const [proxyPayload, runtimePayload] = await Promise.all([
    proxyResponse.json(),
    runtimeResponse.json(),
  ]);
  const proxy = proxyTokenResponse.safeParse(proxyPayload);
  const runtime = runtimeTokenResponse.safeParse(runtimePayload);
  if (!proxy.success || !runtime.success) {
    throw new AppError("Invalid SSH terminal token response", 502);
  }

  return {
    websocketUrl: `wss://${RUNTIME_PORT}-${instanceId}${proxyDomain}/v2/ws/terminal/new`,
    proxyToken: proxy.data.token,
    runtimeToken: runtime.data.vibeongoToken,
    expiresAt: new Date(
      Math.min(
        Date.parse(proxy.data.expiresAt),
        Date.parse(runtime.data.expiresAt),
      ),
    ).toISOString(),
  };
}
