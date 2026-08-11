import { apiRequest } from "@/lib/api";

import type { RuntimeInstance } from "@/features/home/types";

export type OpencodeMessage = {
  info: { id: string; role: "user" | "assistant" | string };
  parts: Array<{ id?: string; type: string; text?: string }>;
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
    instance.config && typeof instance.config === "object" && !Array.isArray(instance.config)
      ? (instance.config as Record<string, unknown>)
      : {};
  const password = typeof config.opencodePassword === "string" ? config.opencodePassword.trim() : "";
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Vibeongo-Proxy-Authorization": `Bearer ${instance.access_token}`,
    ...(password ? { Authorization: `Basic ${globalThis.btoa(`opencode:${password}`)}` } : {}),
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
    throw new Error((await response.text().catch(() => "")) || `OpenCode request failed (${response.status})`);
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

export function createOpencodeChat(instance: RuntimeInstance, directory: string) {
  const query = new URLSearchParams({ directory });
  return request<{ id: string; title?: string }>(instance, `/session?${query}`, {
    method: "POST",
    body: "{}",
  });
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

export function sendOpencodeMessage(
  instance: RuntimeInstance,
  sessionId: string,
  directory: string,
  text: string,
) {
  const query = new URLSearchParams({ directory });
  return request<void>(
    instance,
    `/session/${encodeURIComponent(sessionId)}/prompt_async?${query}`,
    {
      method: "POST",
      body: JSON.stringify({ parts: [{ type: "text", text }] }),
    },
    true,
  );
}
