import type {
  Event,
  Message,
  Part,
  Session,
  SnapshotFileDiff,
} from "@opencode-ai/sdk/v2/client";

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

export type OpencodeProject = {
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

export async function getOpencodeSessions(chatId: string, serverUrl: string) {
  return readJson<Session[]>(
    await fetch(
      withServerUrl(
        `/api/opencode/chats/${encodeURIComponent(chatId)}/sessions`,
        serverUrl,
      ),
    ),
  );
}

export async function getOpencodeProjects(chatId: string, serverUrl: string) {
  return readJson<OpencodeProject[]>(
    await fetch(
      withServerUrl(
        `/api/opencode/chats/${encodeURIComponent(chatId)}/projects`,
        serverUrl,
      ),
    ),
  );
}

export async function getOpencodeSessionRaw(
  chatId: string,
  sessionId: string,
  serverUrl: string,
) {
  return readJson<OpencodeSessionData>(
    await fetch(
      withServerUrl(
        `/api/opencode/chats/${encodeURIComponent(chatId)}/sessions/${encodeURIComponent(sessionId)}`,
        serverUrl,
      ),
    ),
  );
}

export async function createOpencodeSession(
  chatId: string,
  serverUrl: string,
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ directory }),
      },
    ),
  );
}

export async function getOpencodeInventory(chatId: string, serverUrl: string) {
  return readJson<OpencodeInventory>(
    await fetch(
      withServerUrl(
        `/api/opencode/chats/${encodeURIComponent(chatId)}/configuration`,
        serverUrl,
      ),
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
) {
  const response = await fetch(
    withServerUrl(
      `/api/opencode/chats/${encodeURIComponent(chatId)}/sessions/${encodeURIComponent(sessionId)}`,
      serverUrl,
    ),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
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

export type { Event };

function withServerUrl(path: string, serverUrl: string) {
  const params = new URLSearchParams({ serverUrl });
  return `${path}?${params.toString()}`;
}
