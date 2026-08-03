import type {
  Event,
  Message,
  Part,
  Session,
  SnapshotFileDiff,
} from "@opencode-ai/sdk/v2/client";

export type OpencodeChatConnection = {
  chatId: string;
  projectId: string;
};

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

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error((await response.text()) || "OpenCode request failed");
  }

  return response.json() as Promise<T>;
}

export async function getOpencodeSessionsByChat(
  connections: OpencodeChatConnection[],
): Promise<Record<string, Session[]>> {
  const entries = await Promise.all(
    connections.map(async ({ chatId, projectId }) => {
      const sessions = await readJson<Session[]>(
        await fetch(
          `/api/opencode/chats/${encodeURIComponent(chatId)}/sessions`,
        ),
      );

      console.log(`[OpenCode] sessions for ${projectId}/${chatId}`, sessions);
      return [chatId, sessions] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function getOpencodeSessionRaw(chatId: string, sessionId: string) {
  return readJson<OpencodeSessionData>(
    await fetch(
      `/api/opencode/chats/${encodeURIComponent(chatId)}/sessions/${encodeURIComponent(sessionId)}`,
    ),
  );
}

export async function getOpencodeInventory(chatId: string) {
  return readJson<OpencodeInventory>(
    await fetch(
      `/api/opencode/chats/${encodeURIComponent(chatId)}/configuration`,
    ),
  );
}

export async function sendOpencodePrompt(
  chatId: string,
  sessionId: string,
  text: string,
  attachments: UploadAttachment[],
  selection: OpencodePromptSelection,
) {
  const response = await fetch(
    `/api/opencode/chats/${encodeURIComponent(chatId)}/sessions/${encodeURIComponent(sessionId)}`,
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

export function getOpencodeEventUrl(chatId: string) {
  return `/api/opencode/chats/${encodeURIComponent(chatId)}/events`;
}

export type { Event };
