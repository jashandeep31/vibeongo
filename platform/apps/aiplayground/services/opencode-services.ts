import {
  createOpencodeClient,
  type Event,
  type FilePartInput,
  type Message,
  type OpencodeClient,
  type Part,
  type QuestionAnswer,
  type QuestionRequest,
  type Session,
  type SessionStatus,
  type SnapshotFileDiff,
  type TextPartInput,
} from "@opencode-ai/sdk/v2/client";
import {
  getProxyAuthorizationValue,
  PROXY_AUTHORIZATION_HEADER,
} from "@/services/proxy-auth";

const clients = new Map<string, OpencodeClient>();

export type OpencodeSessionData = {
  session: Session;
  status: SessionStatus;
  messages: Array<{ info: Message; parts: Part[] }>;
  questions: QuestionRequest[];
  changes: SnapshotFileDiff[];
  optimistic?: boolean;
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

export async function getOpencodeStatus(
  runtimeUrl: string,
  token: string,
  accessToken: string,
) {
  const normalizedRuntimeUrl = normalizeOpencodeServerUrl(runtimeUrl);
  if (!new URL(normalizedRuntimeUrl).hostname.startsWith("3101-")) {
    throw new Error("Invalid runtime status URL");
  }

  const response = await fetch(`${normalizedRuntimeUrl}/tools-stats`, {
    headers: {
      authorization: `Bearer ${token}`,
      ...getProxyHeaders(accessToken),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw new Error(
      (await response.text()) || "Could not load runtime tool status",
    );
  }

  const stats = (await response.json()) as {
    opencode?: { running?: unknown };
  };
  const running = stats.opencode?.running === true;

  return { running };
}

export async function getOpencodeSessions(
  chatId: string,
  serverUrl: string,
  accessToken: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken);
  const directories = await getOpencodeProjectDirectories(
    chatId,
    serverUrl,
    accessToken,
  );
  const projectDirectories = [
    ...new Set(
      directories.flatMap((project) => [
        project.worktree,
        ...project.sandboxes,
      ]),
    ),
  ].filter(Boolean);
  const results = await Promise.all(
    projectDirectories.map((directory) =>
      client.session.list({
        directory,
        roots: true,
        limit: 100,
      }),
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

export async function getOpencodeProjectDirectories(
  chatId: string,
  serverUrl: string,
  accessToken: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken);
  const result = await client.project.list();

  if (result.error || !result.data) {
    throw new Error("Could not load OpenCode projects");
  }

  return [...result.data]
    .sort((left, right) => {
      if (left.id === "global") return 1;
      if (right.id === "global") return -1;
      return right.time.updated - left.time.updated;
    })
    .map((project) => ({
      id: project.id,
      worktree: project.worktree,
      sandboxes: project.sandboxes,
    }));
}

export async function getOpencodeSessionRaw(
  chatId: string,
  sessionId: string,
  serverUrl: string,
  accessToken: string,
) {
  const session = await findOpencodeSession(
    chatId,
    sessionId,
    serverUrl,
    accessToken,
  );
  if (!session) throw new Error("OpenCode session not found");

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    session.directory,
  );
  const [messagesResult, questionsResult, changesResult, statusesResult] =
    await Promise.all([
      client.session.messages({
        sessionID: sessionId,
        directory: session.directory,
        limit: 100,
      }),
      client.question.list({ directory: session.directory }),
      client.session.diff({
        sessionID: sessionId,
        directory: session.directory,
      }),
      client.session.status({ directory: session.directory }),
    ]);

  if (messagesResult.error) {
    throw new Error("Could not load OpenCode messages");
  }
  if (questionsResult.error) {
    throw new Error("Could not load OpenCode questions");
  }
  if (changesResult.error) {
    throw new Error("Could not load OpenCode changes");
  }
  if (statusesResult.error) {
    throw new Error("Could not load OpenCode session status");
  }

  return {
    session,
    status: statusesResult.data?.[sessionId] ?? { type: "idle" },
    messages: messagesResult.data ?? [],
    questions: (questionsResult.data ?? []).filter(
      (question) => question.sessionID === sessionId,
    ),
    changes: changesResult.data ?? [],
  };
}

export async function createOpencodeSession(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  directory?: string,
) {
  if (directory && !/^\/home\/ubuntu\/code\/[A-Za-z0-9._-]+$/.test(directory)) {
    throw new Error("Invalid repository directory");
  }

  const selectedDirectory =
    directory ??
    (await getOpencodeProjectDirectories(chatId, serverUrl, accessToken))[0]
      ?.worktree;
  if (!selectedDirectory) {
    throw new Error("OpenCode project directory not found");
  }

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    selectedDirectory,
  );
  const result = await client.session.create({ directory: selectedDirectory });

  if (result.error || !result.data) {
    throw new Error("Could not create OpenCode session");
  }

  return result.data;
}

export async function getOpencodeInventory(
  chatId: string,
  serverUrl: string,
  accessToken: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken);
  const [providerResponse, agentsResponse] = await Promise.all([
    client.provider.list(),
    client.app.agents(),
  ]);

  if (providerResponse.error || !providerResponse.data) {
    throw new Error("Could not load OpenCode providers");
  }
  if (agentsResponse.error) {
    throw new Error("Could not load OpenCode agents");
  }

  const connected = new Set(providerResponse.data.connected);
  const models = providerResponse.data.all.flatMap((provider) => {
    if (!connected.has(provider.id)) return [];

    return Object.values(provider.models).map((model) => ({
      id: `${provider.id}/${model.id}`,
      providerID: provider.id,
      modelID: model.id,
      name: model.name,
      providerName: provider.name,
      variants: Object.keys(model.variants ?? {}),
    }));
  });
  const hiddenAgentNames = new Set(["compaction", "title", "summary"]);
  const agents = (agentsResponse.data ?? [])
    .filter(
      (agent) => agent.mode === "primary" && !hiddenAgentNames.has(agent.name),
    )
    .map((agent) => ({
      id: agent.name,
      name: agent.name,
      description: agent.description,
      mode: agent.mode,
    }));

  return { models, agents };
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
  const session = await findOpencodeSession(
    chatId,
    sessionId,
    serverUrl,
    accessToken,
  );
  if (!session) throw new Error("OpenCode session not found");

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    session.directory,
  );
  const parts: Array<TextPartInput | FilePartInput> = [
    ...(text ? [{ type: "text" as const, text }] : []),
    ...attachments.map((attachment) => ({
      type: "file" as const,
      mime: attachment.mimeType,
      filename: attachment.name,
      url: attachment.dataUrl,
    })),
  ];
  const model = parseModelSelection(selection.model);
  const result = await client.session.promptAsync({
    sessionID: sessionId,
    directory: session.directory,
    ...(model ? { model } : {}),
    ...(selection.variant ? { variant: selection.variant } : {}),
    ...(selection.agent ? { agent: selection.agent } : {}),
    parts,
  });

  if (result.error) throw new Error("Could not send OpenCode prompt");
}

export async function abortOpencodeSession(
  chatId: string,
  sessionId: string,
  serverUrl: string,
  accessToken: string,
) {
  const session = await findOpencodeSession(
    chatId,
    sessionId,
    serverUrl,
    accessToken,
  );
  if (!session) throw new Error("OpenCode session not found");

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    session.directory,
  );
  const result = await client.session.abort({
    sessionID: sessionId,
    directory: session.directory,
  });

  if (result.error || result.data !== true) {
    throw new Error("Could not stop the OpenCode session");
  }
}

export async function answerOpencodeQuestion(
  chatId: string,
  sessionId: string,
  requestId: string,
  answers: QuestionAnswer[],
  serverUrl: string,
  accessToken: string,
) {
  const session = await findOpencodeSession(
    chatId,
    sessionId,
    serverUrl,
    accessToken,
  );
  if (!session) throw new Error("OpenCode session not found");

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    session.directory,
  );
  const result = await client.question.reply({
    requestID: requestId,
    directory: session.directory,
    answers,
  });

  if (result.error || result.data !== true) {
    throw new Error("Could not submit the OpenCode question response");
  }
}

export async function rejectOpencodeQuestion(
  chatId: string,
  sessionId: string,
  requestId: string,
  serverUrl: string,
  accessToken: string,
) {
  const session = await findOpencodeSession(
    chatId,
    sessionId,
    serverUrl,
    accessToken,
  );
  if (!session) throw new Error("OpenCode session not found");

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    session.directory,
  );
  const result = await client.question.reject({
    requestID: requestId,
    directory: session.directory,
  });

  if (result.error || result.data !== true) {
    throw new Error("Could not dismiss the OpenCode question");
  }
}

export async function streamOpencodeEvents(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  signal: AbortSignal,
  onEvent: (event: Event) => void,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken);
  const subscription = await client.global.event({ signal });

  for await (const event of subscription.stream) {
    if (signal.aborted) break;
    onEvent(event.payload as unknown as Event);
  }
}

async function findOpencodeSession(
  chatId: string,
  sessionId: string,
  serverUrl: string,
  accessToken: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken);
  const projects = await getOpencodeProjectDirectories(
    chatId,
    serverUrl,
    accessToken,
  );
  const directories = projects.flatMap((project) => [
    project.worktree,
    ...project.sandboxes,
  ]);
  const results = await Promise.all(
    [...new Set(directories.filter(Boolean))].map((directory) =>
      client.session.get({ sessionID: sessionId, directory }),
    ),
  );

  return results.find((result) => !result.error && result.data)?.data;
}

function getOpencodeClient(
  connectionId: string,
  serverUrl: string,
  accessToken: string,
  directory?: string,
) {
  const normalizedServerUrl = normalizeOpencodeServerUrl(serverUrl);
  const cacheKey = `${connectionId}:${normalizedServerUrl}:${directory ?? ""}:${accessToken}`;
  const existingClient = clients.get(cacheKey);
  if (existingClient) return existingClient;

  const client = createOpencodeClient({
    baseUrl: normalizedServerUrl,
    directory,
    headers: getProxyHeaders(accessToken),
    throwOnError: true,
  });
  clients.set(cacheKey, client);
  return client;
}

function normalizeOpencodeServerUrl(serverUrl: string) {
  const url = new URL(serverUrl);

  if (
    url.protocol !== "https:" ||
    (!url.hostname.endsWith(".vibeongo.one") && url.hostname !== "vibeongo.one")
  ) {
    throw new Error("Invalid OpenCode server URL");
  }

  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function getProxyHeaders(accessToken: string): HeadersInit {
  return {
    [PROXY_AUTHORIZATION_HEADER]: getProxyAuthorizationValue(accessToken),
  };
}

function parseModelSelection(modelSlug?: string) {
  const separatorIndex = modelSlug?.indexOf("/") ?? -1;
  if (
    !modelSlug ||
    separatorIndex <= 0 ||
    separatorIndex >= modelSlug.length - 1
  ) {
    return undefined;
  }

  return {
    providerID: modelSlug.slice(0, separatorIndex),
    modelID: modelSlug.slice(separatorIndex + 1),
  };
}

export type { Event, QuestionAnswer, QuestionRequest };
