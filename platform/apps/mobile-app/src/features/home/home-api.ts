import { ApiError, apiFetch, apiRequest } from "@/lib/api";

import type {
  HomeData,
  OpencodeChat,
  Project,
  ProjectGithubRepo,
  ProjectSession,
  ProjectSessionRuntimeKind,
  RecentChat,
  RuntimeInstance,
  UserMetadata,
} from "./types";

type ChatsResponse = { chats: RecentChat[] };

export async function getHomeData(signal?: AbortSignal): Promise<HomeData> {
  const [user, chatsResponse, rawProjects, instances] = await Promise.all([
    apiRequest<UserMetadata>("/api/v1/users/metadata", {}, signal),
    apiRequest<ChatsResponse>(
      "/api/v1/chats?agentName=vibeongo-agent&limit=20",
      {},
      signal,
    ),
    apiRequest<Project[]>("/api/v1/projects/with-sessions", {}, signal),
    apiRequest<RuntimeInstance[]>(
      "/api/v1/instances?state=running&page=1&limit=100",
      {},
      signal,
    ),
  ]);

  const instancesBySession = new Map(
    instances
      .filter((instance) => instance.project_session_id)
      .map((instance) => [instance.project_session_id, instance]),
  );
  const projects = await Promise.all(
    rawProjects.map(async (project) => ({
      ...project,
      sessions: await Promise.all(
        project.sessions.map(async (session) => {
          const instance = instancesBySession.get(session.id) ?? null;
          if (!instance) {
            return {
              ...session,
              runtime: { state: "stopped" as const, instance: null, chats: [] },
            };
          }

          try {
            const isRunning = await getOpencodeStatus(instance, signal);
            if (!isRunning) {
              return {
                ...session,
                runtime: {
                  state: "processing" as const,
                  instance,
                  chats: [],
                },
              };
            }
          } catch (runtimeError) {
            if (signal?.aborted) throw runtimeError;
            return {
              ...session,
              runtime: {
                state: "processing" as const,
                instance,
                chats: [],
                error:
                  runtimeError instanceof Error
                    ? runtimeError.message
                    : "Could not connect to OpenCode.",
              },
            };
          }

          try {
            const chats = await getOpencodeChats(instance, signal);
            return {
              ...session,
              runtime: { state: "running" as const, instance, chats },
            };
          } catch (chatError) {
            if (signal?.aborted) throw chatError;
            return {
              ...session,
              runtime: {
                state: "running" as const,
                instance,
                chats: [],
                error:
                  chatError instanceof Error
                    ? chatError.message
                    : "Could not load OpenCode chats.",
              },
            };
          }
        }),
      ),
    })),
  );

  return { user, chats: chatsResponse.chats, projects };
}

export function deleteChat(id: string, signal?: AbortSignal) {
  return apiAction(`/api/v1/chats/${encodeURIComponent(id)}`, {
    method: "DELETE",
    signal,
  });
}

export function createProjectSession(
  projectId: string,
  sessionName: string,
  sessionDescription?: string,
) {
  return apiRequest<ProjectSession>("/api/v1/project-sessions/", {
    method: "POST",
    body: JSON.stringify({ projectId, sessionName, sessionDescription }),
  });
}

export function resumeProjectSession(
  sessionId: string,
  runtime: ProjectSessionRuntimeKind,
) {
  return apiAction(
    `/api/v1/project-sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "POST",
      body: JSON.stringify({ runtime }),
    },
  );
}

export function archiveProjectSession(sessionId: string) {
  return apiAction(
    `/api/v1/project-sessions/${encodeURIComponent(sessionId)}/archive`,
    { method: "POST", body: JSON.stringify({ action: true }) },
  );
}

export function terminateInstance(instanceId: string) {
  return apiAction(`/api/v1/instances/${encodeURIComponent(instanceId)}`, {
    method: "POST",
  });
}

export function getProjectGithubRepos(projectId: string) {
  return apiRequest<ProjectGithubRepo[]>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/github-repos`,
  );
}

async function apiAction(path: string, init: RequestInit) {
  const response = await apiFetch(path, init);
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    error?: string;
  } | null;

  if (!response.ok) {
    throw new ApiError(
      body?.message ?? body?.error ?? `Request failed (${response.status})`,
      response.status,
    );
  }
  return body;
}

function runtimeOrigin(instance: RuntimeInstance, port: 3101 | 4096) {
  const url = new URL(`https://${port}-${instance.id}${instance.proxy_domain}`);
  if (
    url.protocol !== "https:" ||
    (!url.hostname.endsWith(".vibeongo.one") && url.hostname !== "vibeongo.one")
  ) {
    throw new Error("Invalid runtime URL");
  }
  return url.origin;
}

function getInstanceConfig(instance: RuntimeInstance) {
  return instance.config &&
    typeof instance.config === "object" &&
    !Array.isArray(instance.config)
    ? (instance.config as Record<string, unknown>)
    : {};
}

function getRuntimeHeaders(instance: RuntimeInstance) {
  const config = getInstanceConfig(instance);
  const password =
    typeof config.opencodePassword === "string" &&
    config.opencodePassword.trim()
      ? config.opencodePassword
      : null;

  return {
    "X-Vibeongo-Proxy-Authorization": `Bearer ${instance.access_token}`,
    ...(password
      ? { Authorization: `Basic ${globalThis.btoa(`opencode:${password}`)}` }
      : {}),
  };
}

async function getOpencodeStatus(
  instance: RuntimeInstance,
  signal?: AbortSignal,
) {
  const config = getInstanceConfig(instance);
  const localToken = config.vibeongoLocalToken;
  if (typeof localToken !== "string" || !localToken) return false;

  const response = await fetch(`${runtimeOrigin(instance, 3101)}/tools-stats`, {
    headers: {
      authorization: `Bearer ${localToken}`,
      "X-Vibeongo-Proxy-Authorization": `Bearer ${instance.access_token}`,
    },
    signal,
  });
  if (!response.ok) return false;
  const body = (await response.json()) as { opencode?: { running?: unknown } };
  return body.opencode?.running === true;
}

async function getOpencodeChats(
  instance: RuntimeInstance,
  signal?: AbortSignal,
): Promise<OpencodeChat[]> {
  const origin = runtimeOrigin(instance, 4096);
  const headers = getRuntimeHeaders(instance);
  const projectsResponse = await fetch(`${origin}/project`, {
    headers,
    signal,
  });
  if (!projectsResponse.ok) throw new Error("Could not load OpenCode projects");
  const directories = (await projectsResponse.json()) as Array<{
    worktree?: string;
    sandboxes?: string[];
  }>;
  const uniqueDirectories = [
    ...new Set(
      directories.flatMap((project) => [
        project.worktree,
        ...(project.sandboxes ?? []),
      ]),
    ),
  ].filter((directory): directory is string => Boolean(directory));

  const chatResponses = await Promise.all(
    uniqueDirectories.map(async (directory) => {
      const params = new URLSearchParams({
        directory,
        roots: "true",
        limit: "100",
      });
      const response = await fetch(`${origin}/session?${params.toString()}`, {
        headers,
        signal,
      });
      if (!response.ok) throw new Error("Could not load OpenCode chats");
      return (await response.json()) as OpencodeChat[];
    }),
  );

  const chats = new Map<string, OpencodeChat>();
  chatResponses.flat().forEach((chat) => chats.set(chat.id, chat));
  return [...chats.values()].sort(
    (left, right) => (right.time?.updated ?? 0) - (left.time?.updated ?? 0),
  );
}
