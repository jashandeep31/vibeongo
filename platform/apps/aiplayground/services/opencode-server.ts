import "server-only";

import {
  createOpencodeClient,
  type OpencodeClient,
  type Session,
} from "@opencode-ai/sdk/v2/client";

const serverUrls: Record<string, string | undefined> = {
  "landing-page-copy":
    process.env.OPENCODE_LANDING_PAGE_COPY_URL ??
    "https://aeh0l2q99e.in.vibeongo.one",
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

export async function getOpencodeProjectDirectories(chatId: string) {
  const client = getOpencodeServerClient(chatId);
  const result = await client.project.list();

  if (result.error || !result.data) {
    throw new Error("Could not load OpenCode projects");
  }

  const projects = [...result.data].sort((left, right) => {
    if (left.id === "global") return 1;
    if (right.id === "global") return -1;
    return right.time.updated - left.time.updated;
  });
  const projectDirectories = projects.flatMap((project) => [
    project.worktree,
    ...project.sandboxes,
  ]);

  return [...new Set(projectDirectories.filter(Boolean))];
}

export async function getOpencodeSessionsAcrossProjects(chatId: string) {
  const client = getOpencodeServerClient(chatId);
  const directories = await getOpencodeProjectDirectories(chatId);
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

export async function findOpencodeSession(chatId: string, sessionId: string) {
  const client = getOpencodeServerClient(chatId);
  const directories = await getOpencodeProjectDirectories(chatId);
  const results = await Promise.all(
    directories.map((directory) =>
      client.session.get({ sessionID: sessionId, directory }),
    ),
  );

  return results.find((result) => !result.error && result.data)?.data;
}
