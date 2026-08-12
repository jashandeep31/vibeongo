import {
  getProxyAuthorizationValue,
  PROXY_AUTHORIZATION_HEADER,
} from "./proxy-auth.js";

export type TerminateAfterDoneStatus = {
  terminate: boolean;
};

export type RuntimeStats = {
  total: number;
  used: number;
  free: number;
  used_percent: number;
  cpu_percent: number;
  time: string;
};

type RuntimeConnection = {
  runtimeUrl: string;
  localToken: string;
  accessToken: string;
};

function getRuntimeUrl(runtimeUrl: string) {
  const url = new URL(runtimeUrl);
  if (!url.hostname.startsWith("3101-")) {
    throw new Error("Invalid VibeOnGo runtime URL");
  }

  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function getRuntimeHeaders(localToken: string, accessToken: string) {
  return {
    authorization: `Bearer ${localToken}`,
    [PROXY_AUTHORIZATION_HEADER]: getProxyAuthorizationValue(accessToken),
  };
}

async function assertRuntimeResponse(response: Response, fallback: string) {
  if (response.ok) return;
  throw new Error((await response.text()) || fallback);
}

export async function getTerminateAfterDoneStatus({
  runtimeUrl,
  localToken,
  accessToken,
}: RuntimeConnection): Promise<TerminateAfterDoneStatus> {
  const response = await fetch(
    `${getRuntimeUrl(runtimeUrl)}/terminate-after-done`,
    {
      headers: getRuntimeHeaders(localToken, accessToken),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    },
  );
  await assertRuntimeResponse(
    response,
    "Could not load terminate-after-done setting",
  );
  return response.json() as Promise<TerminateAfterDoneStatus>;
}

export async function getRuntimeStats({
  runtimeUrl,
  localToken,
  accessToken,
}: RuntimeConnection): Promise<RuntimeStats> {
  const response = await fetch(`${getRuntimeUrl(runtimeUrl)}/stats`, {
    headers: getRuntimeHeaders(localToken, accessToken),
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  await assertRuntimeResponse(response, "Could not load runtime stats");
  return response.json() as Promise<RuntimeStats>;
}

export async function disableTerminateAfterDone({
  runtimeUrl,
  localToken,
  accessToken,
}: RuntimeConnection): Promise<TerminateAfterDoneStatus> {
  const response = await fetch(
    `${getRuntimeUrl(runtimeUrl)}/terminate-after-done/disable`,
    {
      method: "POST",
      headers: getRuntimeHeaders(localToken, accessToken),
      signal: AbortSignal.timeout(5_000),
    },
  );
  await assertRuntimeResponse(
    response,
    "Could not disable terminate after done",
  );
  return response.json() as Promise<TerminateAfterDoneStatus>;
}
