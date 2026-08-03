import "server-only";

import {
  createOpencodeClient,
  type OpencodeClient,
} from "@opencode-ai/sdk/v2/client";

const serverUrls: Record<string, string | undefined> = {
  "landing-page-copy":
    process.env.OPENCODE_LANDING_PAGE_COPY_URL ?? "http://192.168.1.69:4096",
};

const clients = new Map<string, OpencodeClient>();

export function getOpencodeServerClient(chatId: string) {
  const serverUrl = serverUrls[chatId];
  if (!serverUrl) {
    throw new Error("OpenCode server is not configured for this chat");
  }

  const existingClient = clients.get(chatId);
  if (existingClient) return existingClient;

  const client = createOpencodeClient({ baseUrl: serverUrl });
  clients.set(chatId, client);
  return client;
}
