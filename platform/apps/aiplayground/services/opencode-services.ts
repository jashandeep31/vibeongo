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
