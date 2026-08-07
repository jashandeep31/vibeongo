import type {
  Event,
  Message,
  Part,
  Session,
  SnapshotFileDiff,
} from "@opencode-ai/sdk/v2/client";
import {
  getProxyAuthorizationValue,
  PROXY_AUTHORIZATION_HEADER,
} from "@/services/proxy-auth";

export type OpencodeSessionData = {
  session: Session;
  messages: Array<{ info: Message; parts: Part[] }>;
  changes: SnapshotFileDiff[];
};

export type UploadAttachment = {
  type: "image";
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
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
  mode: "subagent" | "primary" | "all";
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

export type OpencodeStatus = {
  running: boolean;
};

export type OpencodeProjectDirectories = {
  id: string;
  worktree: string;
  sandboxes: string[];
};

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error((await response.text()) || "OpenCode request failed");
  }

  return response.json() as Promise<T>;
}

export async function getOpencodeStatus(
  runtimeUrl: string,
  token: string,
  accessToken: string,
) {
  return readJson<OpencodeStatus>(
    await fetch("/api/opencode/status", {
      method: "POST",
      headers: getOpencodeRequestHeaders(accessToken, true),
      body: JSON.stringify({ runtimeUrl, token }),
    }),
  );
}

export async function getOpencodeSessions(
  chatId: string,
  serverUrl: string,
  accessToken: string,
) {
  return readJson<Session[]>(
    await fetch(
      withServerUrl(
        `/api/opencode/chats/${encodeURIComponent(chatId)}/sessions`,
        serverUrl,
      ),
      { headers: getOpencodeRequestHeaders(accessToken) },
    ),
  );
}

export async function getOpencodeProjectDirectories(
  chatId: string,
  serverUrl: string,
  accessToken: string,
) {
  return readJson<OpencodeProjectDirectories[]>(
    await fetch(
      withServerUrl(
        `/api/opencode/chats/${encodeURIComponent(chatId)}/projects`,
        serverUrl,
      ),
      { headers: getOpencodeRequestHeaders(accessToken) },
    ),
  );
}

export async function getOpencodeSessionRaw(
  chatId: string,
  sessionId: string,
  serverUrl: string,
  accessToken: string,
) {
  return readJson<OpencodeSessionData>(
    await fetch(
      withServerUrl(
        `/api/opencode/chats/${encodeURIComponent(chatId)}/sessions/${encodeURIComponent(sessionId)}`,
        serverUrl,
      ),
      { headers: getOpencodeRequestHeaders(accessToken) },
    ),
  );
}

export async function createOpencodeSession(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  directory?: string,
) {
  return readJson<Session>(
    await fetch(
      withServerUrl(
        `/api/opencode/chats/${encodeURIComponent(chatId)}/sessions`,
        serverUrl,
      ),
      {
        method: "POST",
        headers: getOpencodeRequestHeaders(accessToken, true),
        body: JSON.stringify({ directory }),
      },
    ),
  );
}

export async function getOpencodeInventory(
  chatId: string,
  serverUrl: string,
  accessToken: string,
) {
  return readJson<OpencodeInventory>(
    await fetch(
      withServerUrl(
        `/api/opencode/chats/${encodeURIComponent(chatId)}/configuration`,
        serverUrl,
      ),
      { headers: getOpencodeRequestHeaders(accessToken) },
    ),
  );
}

export async function sendOpencodePrompt(
  chatId: string,
  sessionId: string,
  text: string,
  attachments: UploadAttachment[],
  selection: OpencodePromptSelection,
  serverUrl: string,
  accessToken: string,
) {
  const response = await fetch(
    withServerUrl(
      `/api/opencode/chats/${encodeURIComponent(chatId)}/sessions/${encodeURIComponent(sessionId)}`,
      serverUrl,
    ),
    {
      method: "POST",
      headers: getOpencodeRequestHeaders(accessToken, true),
      body: JSON.stringify({ text, attachments, selection }),
    },
  );

  if (!response.ok) {
    throw new Error(
      (await response.text()) || "Could not send OpenCode prompt",
    );
  }
}

export function getOpencodeEventUrl(chatId: string, serverUrl: string) {
  return withServerUrl(
    `/api/opencode/chats/${encodeURIComponent(chatId)}/events`,
    serverUrl,
  );
}

export async function streamOpencodeEvents(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  signal: AbortSignal,
  onEvent: (event: Event) => void,
) {
  const response = await fetch(getOpencodeEventUrl(chatId, serverUrl), {
    headers: getOpencodeRequestHeaders(accessToken),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error((await response.text()) || "OpenCode event stream failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const messages = buffer.split(/\r?\n\r?\n/);
    buffer = messages.pop() ?? "";

    for (const message of messages) {
      const data = message
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data) onEvent(JSON.parse(data) as Event);
    }

    if (done) break;
  }
}

export type { Event };

function withServerUrl(path: string, serverUrl: string) {
  const params = new URLSearchParams({ serverUrl });
  return `${path}?${params.toString()}`;
}

function getOpencodeRequestHeaders(
  accessToken: string,
  includeContentType = false,
): HeadersInit {
  return {
    ...(includeContentType ? { "content-type": "application/json" } : {}),
    [PROXY_AUTHORIZATION_HEADER]: getProxyAuthorizationValue(accessToken),
  };
}
