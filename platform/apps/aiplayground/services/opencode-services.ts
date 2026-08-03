import {
  createOpencodeClient,
  type OpencodeClient,
} from "@opencode-ai/sdk/client";
import type { Session } from "@opencode-ai/sdk";

export type OpencodeChatConnection = {
  chatId: string;
  projectId: string;
  serverUrl: string;
};

const chatClients = new Map<
  string,
  { serverUrl: string; client: OpencodeClient }
>();

export function getOpencodeChatClient(chatId: string, serverUrl: string) {
  const existingConnection = chatClients.get(chatId);
  if (existingConnection?.serverUrl === serverUrl) {
    return existingConnection.client;
  }

  const client = createOpencodeClient({
    baseUrl: serverUrl,
  });

  chatClients.set(chatId, { serverUrl, client });
  return client;
}

export async function getOpencodeSessionsByChat(
  connections: OpencodeChatConnection[],
): Promise<Record<string, Session[]>> {
  const entries = await Promise.all(
    connections.map(async ({ chatId, projectId, serverUrl }) => {
      const client = getOpencodeChatClient(chatId, serverUrl);
      const result = await client.session.list();

      if (result.error || !result.data) {
        throw new Error(`Could not load OpenCode sessions for chat ${chatId}`);
      }

      console.log(`[OpenCode] sessions for ${projectId}/${chatId}`, result.data);
      return [chatId, result.data] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function getOpencodeSessionRaw(
  chatId: string,
  serverUrl: string,
  sessionId: string,
) {
  const client = getOpencodeChatClient(chatId, serverUrl);
  const path = { id: sessionId };
  const [sessionResult, messagesResult, changesResult] = await Promise.all([
    client.session.get({ path }),
    client.session.messages({ path }),
    client.session.diff({ path }),
  ]);

  if (sessionResult.error || !sessionResult.data) {
    throw new Error(`Could not load OpenCode session ${sessionId}`);
  }

  if (messagesResult.error || !messagesResult.data) {
    throw new Error(`Could not load messages for OpenCode session ${sessionId}`);
  }

  if (changesResult.error || !changesResult.data) {
    throw new Error(`Could not load changes for OpenCode session ${sessionId}`);
  }

  return {
    session: sessionResult.data,
    messages: messagesResult.data,
    changes: changesResult.data,
  };
}
