import { apiRequest } from "@/lib/api";

import type { RuntimeInstance } from "@/features/home/types";

export type OpencodeMessage = {
  info: { id: string; role: "user" | "assistant" | string };
  parts: OpencodePart[];
};

export type OpencodeToolState = {
  status: "pending" | "running" | "completed" | "error";
  input: Record<string, unknown>;
  title?: string;
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

export type OpencodePart = {
  id?: string;
  type: string;
  text?: string;
  mime?: string;
  filename?: string;
  url?: string;
  ignored?: boolean;
  tool?: string;
  state?: OpencodeToolState;
};

export type OpencodeImageAttachment = {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
  dataUrl: string;
};

export type OpencodeQuestion = {
  id: string;
  sessionID: string;
  questions: Array<{
    question: string;
    header: string;
    options: Array<{ label: string; description: string }>;
    multiple?: boolean;
    custom?: boolean;
  }>;
};

export type OpencodePermission = {
  id: string;
  sessionID: string;
  permission: string;
  patterns: string[];
  always: string[];
};

export type OpencodeSessionStatus = {
  type: "idle" | "busy" | "retry";
};

export type OpencodeChatState = {
  messages: OpencodeMessage[];
  questions: OpencodeQuestion[];
  permissions: OpencodePermission[];
  status: OpencodeSessionStatus;
};

export type OpencodeModelOption = {
  id: string;
  providerID: string;
  modelID: string;
  name: string;
  providerName: string;
  variants: string[];
};

export type OpencodeAgentOption = {
  id: string;
  name: string;
  description?: string;
};

export type OpencodeInventory = {
  models: OpencodeModelOption[];
  agents: OpencodeAgentOption[];
};

export type OpencodePromptSelection = {
  model?: string;
  variant?: string;
  agent?: string;
};

export type OpencodeSession = {
  id: string;
  title?: string;
  directory?: string;
  time?: { created?: number; updated?: number };
  agent?: string;
  model?: { providerID: string; id: string; variant?: string };
};

export type OpencodeChatOption = {
  id: string;
  title: string;
  directory?: string;
  time?: { created?: number; updated?: number };
};

function origin(instance: RuntimeInstance) {
  const url = new URL(`https://4096-${instance.id}${instance.proxy_domain}`);
  if (
    url.protocol !== "https:" ||
    (!url.hostname.endsWith(".vibeongo.one") && url.hostname !== "vibeongo.one")
  ) {
    throw new Error("Invalid OpenCode server URL");
  }
  return url.origin;
}

function headers(instance: RuntimeInstance) {
  const config =
    instance.config &&
    typeof instance.config === "object" &&
    !Array.isArray(instance.config)
      ? (instance.config as Record<string, unknown>)
      : {};
  const password =
    typeof config.opencodePassword === "string"
      ? config.opencodePassword.trim()
      : "";
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Vibeongo-Proxy-Authorization": `Bearer ${instance.access_token}`,
    ...(password
      ? { Authorization: `Basic ${globalThis.btoa(`opencode:${password}`)}` }
      : {}),
  };
}

async function request<T>(
  instance: RuntimeInstance,
  path: string,
  init: RequestInit = {},
  allowEmpty = false,
): Promise<T> {
  const response = await fetch(`${origin(instance)}${path}`, {
    ...init,
    headers: { ...headers(instance), ...init.headers },
  });
  if (!response.ok) {
    throw new Error(
      (await response.text().catch(() => "")) ||
        `OpenCode request failed (${response.status})`,
    );
  }
  if (allowEmpty || response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getRunningSessionInstance(projectSessionId: string) {
  const instances = await apiRequest<RuntimeInstance[]>(
    `/api/v1/instances?state=running&session_id=${encodeURIComponent(projectSessionId)}&page=1&limit=1`,
  );
  const instance = instances[0];
  if (!instance) throw new Error("This project session is no longer running.");
  return instance;
}

export function createOpencodeChat(
  instance: RuntimeInstance,
  directory: string,
) {
  const query = new URLSearchParams({ directory });
  return request<{ id: string; title?: string }>(
    instance,
    `/session?${query}`,
    {
      method: "POST",
      body: "{}",
    },
  );
}

export function getOpencodeMessages(
  instance: RuntimeInstance,
  sessionId: string,
  directory: string,
) {
  const query = new URLSearchParams({ directory, limit: "100" });
  return request<OpencodeMessage[]>(
    instance,
    `/session/${encodeURIComponent(sessionId)}/message?${query}`,
  );
}

export async function getOpencodeChatState(
  instance: RuntimeInstance,
  sessionId: string,
  directory: string,
): Promise<OpencodeChatState> {
  const query = new URLSearchParams({ directory });
  const messageQuery = new URLSearchParams({ directory, limit: "100" });
  const [messages, questions, permissions, statuses] = await Promise.all([
    request<OpencodeMessage[]>(
      instance,
      `/session/${encodeURIComponent(sessionId)}/message?${messageQuery}`,
    ),
    request<OpencodeQuestion[]>(instance, `/question?${query}`),
    request<OpencodePermission[]>(instance, `/permission?${query}`),
    request<Record<string, OpencodeSessionStatus>>(
      instance,
      `/session/status?${query}`,
    ),
  ]);

  return {
    messages,
    questions: questions.filter((question) => question.sessionID === sessionId),
    permissions: permissions.filter(
      (permission) => permission.sessionID === sessionId,
    ),
    status: statuses[sessionId] ?? { type: "idle" },
  };
}

export function answerOpencodeQuestion(
  instance: RuntimeInstance,
  requestId: string,
  directory: string,
  answers: string[][],
) {
  const query = new URLSearchParams({ directory });
  return request<boolean>(
    instance,
    `/question/${encodeURIComponent(requestId)}/reply?${query}`,
    { method: "POST", body: JSON.stringify({ answers }) },
  );
}

export function rejectOpencodeQuestion(
  instance: RuntimeInstance,
  requestId: string,
  directory: string,
) {
  const query = new URLSearchParams({ directory });
  return request<boolean>(
    instance,
    `/question/${encodeURIComponent(requestId)}/reject?${query}`,
    { method: "POST" },
  );
}

export function replyOpencodePermission(
  instance: RuntimeInstance,
  requestId: string,
  directory: string,
  reply: "once" | "always" | "reject",
) {
  const query = new URLSearchParams({ directory });
  return request<boolean>(
    instance,
    `/permission/${encodeURIComponent(requestId)}/reply?${query}`,
    { method: "POST", body: JSON.stringify({ reply }) },
  );
}

export function getOpencodeSession(
  instance: RuntimeInstance,
  sessionId: string,
  directory: string,
) {
  const query = new URLSearchParams({ directory });
  return request<OpencodeSession>(
    instance,
    `/session/${encodeURIComponent(sessionId)}?${query}`,
  );
}

export async function getOpencodeChats(
  instance: RuntimeInstance,
  fallbackDirectory: string,
): Promise<OpencodeChatOption[]> {
  const projects = await request<
    Array<{ worktree?: string; sandboxes?: string[] }>
  >(instance, "/project");
  const directories = [
    ...new Set(
      projects.flatMap((project) => [
        project.worktree,
        ...(project.sandboxes ?? []),
      ]),
    ),
  ].filter((directory): directory is string => Boolean(directory));
  if (directories.length === 0 && fallbackDirectory) {
    directories.push(fallbackDirectory);
  }

  const responses = await Promise.all(
    directories.map((directory) => {
      const query = new URLSearchParams({
        directory,
        roots: "true",
        limit: "100",
      });
      return request<OpencodeChatOption[]>(instance, `/session?${query}`).then(
        (sessions) =>
          sessions.map((session) => ({
            ...session,
            title: session.title?.trim() || "Untitled chat",
            directory: session.directory ?? directory,
          })),
      );
    }),
  );
  const chats = new Map<string, OpencodeChatOption>();
  responses.flat().forEach((chat) => chats.set(chat.id, chat));
  return [...chats.values()].sort(
    (left, right) => (right.time?.updated ?? 0) - (left.time?.updated ?? 0),
  );
}

export async function getOpencodeInventory(
  instance: RuntimeInstance,
  directory: string,
): Promise<OpencodeInventory> {
  const query = new URLSearchParams({ directory });
  const [providerResponse, agentResponse] = await Promise.all([
    request<{
      all: Array<{
        id: string;
        name: string;
        models: Record<
          string,
          { id: string; name: string; variants?: Record<string, unknown> }
        >;
      }>;
      connected: string[];
    }>(instance, `/provider?${query}`),
    request<
      Array<{
        name: string;
        description?: string;
        mode: "subagent" | "primary" | "all";
      }>
    >(instance, `/agent?${query}`),
  ]);
  const connected = new Set(providerResponse.connected);
  const models = providerResponse.all
    .flatMap((provider) =>
      connected.has(provider.id)
        ? Object.values(provider.models).map((model) => ({
            id: `${provider.id}/${model.id}`,
            providerID: provider.id,
            modelID: model.id,
            name: model.name,
            providerName: provider.name,
            variants: Object.keys(model.variants ?? {}),
          }))
        : [],
    )
    .sort((left, right) => left.name.localeCompare(right.name));
  const hiddenAgents = new Set(["compaction", "title", "summary"]);
  const agents = agentResponse
    .filter(
      (agent) => agent.mode === "primary" && !hiddenAgents.has(agent.name),
    )
    .map((agent) => ({
      id: agent.name,
      name: agent.name,
      description: agent.description,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return { models, agents };
}

export function sendOpencodeMessage(
  instance: RuntimeInstance,
  sessionId: string,
  directory: string,
  text: string,
  selection: OpencodePromptSelection = {},
  attachments: OpencodeImageAttachment[] = [],
) {
  const query = new URLSearchParams({ directory });
  const separator = selection.model?.indexOf("/") ?? -1;
  const model =
    selection.model && separator > 0
      ? {
          providerID: selection.model.slice(0, separator),
          modelID: selection.model.slice(separator + 1),
        }
      : undefined;
  return request<void>(
    instance,
    `/session/${encodeURIComponent(sessionId)}/prompt_async?${query}`,
    {
      method: "POST",
      body: JSON.stringify({
        ...(model ? { model } : {}),
        ...(selection.variant ? { variant: selection.variant } : {}),
        ...(selection.agent ? { agent: selection.agent } : {}),
        parts: [
          ...(text ? [{ type: "text", text }] : []),
          ...attachments.map((attachment) => ({
            type: "file",
            mime: attachment.mimeType,
            filename: attachment.name,
            url: attachment.dataUrl,
          })),
        ],
      }),
    },
    true,
  );
}
