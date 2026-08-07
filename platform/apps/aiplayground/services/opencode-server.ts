import "server-only";

import {
  createOpencodeClient,
  type OpencodeClient,
  type Session,
} from "@opencode-ai/sdk/v2/client";
import {
  getProxyAuthorizationFromRequest,
  PROXY_AUTHORIZATION_HEADER,
} from "@/services/proxy-auth";

const clients = new Map<string, OpencodeClient>();

export function getOpencodeServerUrl(request: Request) {
  const serverUrl = new URL(request.url).searchParams.get("serverUrl");
  if (!serverUrl) throw new Error("OpenCode server URL is required");
  return normalizeOpencodeServerUrl(serverUrl);
}

export function getOpencodeProxyAuthorization(request: Request) {
  return getProxyAuthorizationFromRequest(request);
}

export function getOpencodeServerClient(
  connectionId: string,
  serverUrl: string,
  proxyAuthorization: string,
  directory?: string,
) {
  const normalizedServerUrl = normalizeOpencodeServerUrl(serverUrl);
  const cacheKey = `${connectionId}:${normalizedServerUrl}:${directory ?? ""}:${proxyAuthorization}`;

  const existingClient = clients.get(cacheKey);
  if (existingClient) return existingClient;

  const client = createOpencodeClient({
    baseUrl: normalizedServerUrl,
    directory,
    headers: { [PROXY_AUTHORIZATION_HEADER]: proxyAuthorization },
    throwOnError: true,
  });
  clients.set(cacheKey, client);
  return client;
}

export async function getOpencodeProjectDirectories(
  connectionId: string,
  serverUrl: string,
  proxyAuthorization: string,
) {
  const projects = await getOpencodeProjects(
    connectionId,
    serverUrl,
    proxyAuthorization,
  );
  const projectDirectories = projects.flatMap((project) => [
    project.worktree,
    ...project.sandboxes,
  ]);

  return [...new Set(projectDirectories.filter(Boolean))];
}

export async function getOpencodeProjects(
  connectionId: string,
  serverUrl: string,
  proxyAuthorization: string,
) {
  const client = getOpencodeServerClient(
    connectionId,
    serverUrl,
    proxyAuthorization,
  );
  const result = await client.project.list();

  if (result.error || !result.data) {
    throw new Error("Could not load OpenCode projects");
  }

  const projects = [...result.data].sort((left, right) => {
    if (left.id === "global") return 1;
    if (right.id === "global") return -1;
    return right.time.updated - left.time.updated;
  });

  return projects;
}

export async function getOpencodeSessionsAcrossProjects(
  connectionId: string,
  serverUrl: string,
  proxyAuthorization: string,
) {
  const client = getOpencodeServerClient(
    connectionId,
    serverUrl,
    proxyAuthorization,
  );
  const directories = await getOpencodeProjectDirectories(
    connectionId,
    serverUrl,
    proxyAuthorization,
  );
  const results = await Promise.all(
    directories.map((directory) =>
      client.session.list({ directory, roots: true, limit: 100 }),
    ),
  );

  if (results.some((result) => result.error)) {
    throw new Error("Could not load OpenCode sessions");
  }

  const sessionsById = new Map<string, Session>();
  for (const session of results.flatMap((result) => result.data ?? [])) {
    sessionsById.set(session.id, session);
  }

  return [...sessionsById.values()].sort(
    (left, right) => right.time.updated - left.time.updated,
  );
}

export async function findOpencodeSession(
  connectionId: string,
  sessionId: string,
  serverUrl: string,
  proxyAuthorization: string,
) {
  const client = getOpencodeServerClient(
    connectionId,
    serverUrl,
    proxyAuthorization,
  );
  const directories = await getOpencodeProjectDirectories(
    connectionId,
    serverUrl,
    proxyAuthorization,
  );
  const results = await Promise.all(
    directories.map((directory) =>
      client.session.get({ sessionID: sessionId, directory }),
    ),
  );

  return results.find((result) => !result.error && result.data)?.data;
}

export function normalizeOpencodeServerUrl(serverUrl: string) {
  const url = new URL(serverUrl);

  if (
    url.protocol !== "https:" ||
    (!url.hostname.endsWith(".vibeongo.one") && url.hostname !== "vibeongo.one")
  ) {
    throw new Error("Invalid OpenCode server URL");
  }

  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}
