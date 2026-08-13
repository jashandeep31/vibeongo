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
} from "./proxy-auth.js";

const clients = new Map<string, OpencodeClient>();

export type OpencodeSessionData = {
  session: Session;
  status: SessionStatus;
  messages: Array<{ info: Message; parts: Part[] }>;
  questions: QuestionRequest[];
  changes: SnapshotFileDiff[];
  optimistic?: boolean;
};

export function reduceOpencodeMessages(
  messages: OpencodeSessionData["messages"],
  event: Event,
  sessionId: string,
) {
  if (
    event.type === "message.updated" &&
    event.properties.sessionID === sessionId
  ) {
    const currentMessages =
      event.properties.info.role === "user"
        ? messages.filter(
            (message) => !message.info.id.startsWith("optimistic:"),
          )
        : messages;
    const messageIndex = currentMessages.findIndex(
      (message) => message.info.id === event.properties.info.id,
    );
    const nextMessages = [...currentMessages];

    if (messageIndex === -1) {
      nextMessages.push({ info: event.properties.info, parts: [] });
    } else {
      nextMessages[messageIndex] = {
        info: event.properties.info,
        parts: nextMessages[messageIndex]?.parts ?? [],
      };
    }

    return nextMessages;
  }

  if (
    event.type === "message.part.updated" &&
    event.properties.sessionID === sessionId
  ) {
    const updatedPart = event.properties.part;
    return messages.map((message) => {
      if (message.info.id !== updatedPart.messageID) return message;

      const partIndex = message.parts.findIndex(
        (part) => part.id === updatedPart.id,
      );
      const parts = [...message.parts];

      if (partIndex === -1) {
        parts.push(updatedPart);
      } else {
        parts[partIndex] = updatedPart;
      }

      return { ...message, parts };
    });
  }

  if (
    event.type === "message.part.delta" &&
    event.properties.sessionID === sessionId
  ) {
    const { messageID, partID, field, delta } = event.properties;
    return messages.map((message) => {
      if (message.info.id !== messageID) return message;

      return {
        ...message,
        parts: message.parts.map((part) => {
          if (part.id !== partID) return part;

          const partRecord = part as unknown as Record<string, unknown>;
          const existingValue = partRecord[field];
          return {
            ...part,
            [field]: `${typeof existingValue === "string" ? existingValue : ""}${delta}`,
          };
        }),
      };
    });
  }

  if (
    event.type === "message.removed" &&
    event.properties.sessionID === sessionId
  ) {
    return messages.filter(
      (message) => message.info.id !== event.properties.messageID,
    );
  }

  if (
    event.type === "message.part.removed" &&
    event.properties.sessionID === sessionId
  ) {
    return messages.map((message) =>
      message.info.id === event.properties.messageID
        ? {
            ...message,
            parts: message.parts.filter(
              (part) => part.id !== event.properties.partID,
            ),
          }
        : message,
    );
  }

  return messages;
}

export function reduceOpencodeSessionData(
  current: OpencodeSessionData,
  event: Event,
  sessionId: string,
): OpencodeSessionData {
  if (
    event.type === "question.asked" &&
    event.properties.sessionID === sessionId
  ) {
    const question = event.properties;
    return {
      ...current,
      questions: [
        ...current.questions.filter((item) => item.id !== question.id),
        question,
      ],
    };
  }

  if (
    (event.type === "question.replied" || event.type === "question.rejected") &&
    event.properties.sessionID === sessionId
  ) {
    return {
      ...current,
      questions: current.questions.filter(
        (question) => question.id !== event.properties.requestID,
      ),
    };
  }

  const messages = reduceOpencodeMessages(current.messages, event, sessionId);
  if (messages !== current.messages) {
    return {
      ...current,
      messages,
      ...(event.type === "message.updated" &&
      event.properties.info.role === "user"
        ? { optimistic: false }
        : {}),
    };
  }

  if (
    event.type === "session.status" &&
    event.properties.sessionID === sessionId
  ) {
    return { ...current, status: event.properties.status };
  }

  if (
    (event.type === "session.idle" || event.type === "session.error") &&
    event.properties.sessionID === sessionId
  ) {
    return { ...current, status: { type: "idle" } };
  }

  if (
    event.type === "session.updated" &&
    event.properties.sessionID === sessionId
  ) {
    return { ...current, session: event.properties.info };
  }

  if (
    event.type === "session.diff" &&
    event.properties.sessionID === sessionId
  ) {
    return { ...current, changes: event.properties.diff };
  }

  return current;
}

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
  defaultSelection: OpencodePromptSelection;
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
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  const directories = await getOpencodeProjectDirectories(
    chatId,
    serverUrl,
    accessToken,
    password,
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

  return [...sessionsById.values()]
    .filter((session) => !session.parentID)
    .sort((left, right) => right.time.created - left.time.created);
}

export async function getOpencodeProjectDirectories(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
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
  password?: string,
) {
  const session = await findOpencodeSession(
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  );
  if (!session) throw new Error("OpenCode session not found");

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
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

export async function getOpencodeSessionMessages(
  chatId: string,
  session: Session,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
    session.directory,
  );
  const result = await client.session.messages({
    sessionID: session.id,
    directory: session.directory,
    limit: 100,
  });

  if (result.error) {
    throw new Error(
      `Could not load messages for OpenCode session ${session.id}`,
    );
  }

  return result.data ?? [];
}

export async function getOpencodeSessionStatuses(
  chatId: string,
  sessions: Session[],
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const directories = [
    ...new Set(sessions.map((session) => session.directory).filter(Boolean)),
  ];
  const results = await Promise.all(
    directories.map(async (directory) => {
      const client = getOpencodeClient(
        chatId,
        serverUrl,
        accessToken,
        password,
        directory,
      );
      return client.session.status({ directory });
    }),
  );

  if (results.some((result) => result.error)) {
    throw new Error("Could not load OpenCode session statuses");
  }

  return Object.assign(
    {},
    ...results.map((result) => result.data ?? {}),
  ) as Record<string, SessionStatus>;
}

export async function createOpencodeSession(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  directory?: string,
  password?: string,
) {
  if (directory && !/^\/home\/ubuntu\/code\/[A-Za-z0-9._-]+$/.test(directory)) {
    throw new Error("Invalid repository directory");
  }

  const selectedDirectory =
    directory ??
    (
      await getOpencodeProjectDirectories(
        chatId,
        serverUrl,
        accessToken,
        password,
      )
    )[0]?.worktree;
  if (!selectedDirectory) {
    throw new Error("OpenCode project directory not found");
  }

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
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
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  const [providerResponse, agentsResponse, configResponse] = await Promise.all([
    client.provider.list(),
    client.app.agents(),
    client.config.get(),
  ]);

  if (providerResponse.error || !providerResponse.data) {
    throw new Error("Could not load OpenCode providers");
  }
  if (agentsResponse.error) {
    throw new Error("Could not load OpenCode agents");
  }
  if (configResponse.error) {
    throw new Error("Could not load OpenCode configuration");
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

  return {
    models,
    agents,
    defaultSelection: {
      model: configResponse.data?.model,
      agent: configResponse.data?.default_agent,
    },
  };
}

export async function sendOpencodePrompt(
  chatId: string,
  sessionId: string,
  text: string,
  attachments: UploadAttachment[],
  selection: OpencodePromptSelection,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const session = await findOpencodeSession(
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  );
  if (!session) throw new Error("OpenCode session not found");

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
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
  password?: string,
) {
  const session = await findOpencodeSession(
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  );
  if (!session) throw new Error("OpenCode session not found");

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
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

export async function revertOpencodeSession(
  chatId: string,
  sessionId: string,
  messageId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const session = await findOpencodeSession(
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  );
  if (!session) throw new Error("OpenCode session not found");

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
    session.directory,
  );
  const result = await client.session.revert({
    sessionID: sessionId,
    directory: session.directory,
    messageID: messageId,
  });

  if (result.error || !result.data) {
    throw new Error("Could not revert the OpenCode session");
  }

  return result.data;
}

export async function unrevertOpencodeSession(
  chatId: string,
  sessionId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const session = await findOpencodeSession(
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  );
  if (!session) throw new Error("OpenCode session not found");

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
    session.directory,
  );
  const result = await client.session.unrevert({
    sessionID: sessionId,
    directory: session.directory,
  });

  if (result.error || !result.data) {
    throw new Error("Could not restore the reverted messages");
  }

  return result.data;
}

export async function answerOpencodeQuestion(
  chatId: string,
  sessionId: string,
  requestId: string,
  answers: QuestionAnswer[],
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const session = await findOpencodeSession(
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  );
  if (!session) throw new Error("OpenCode session not found");

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
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
  password?: string,
) {
  const session = await findOpencodeSession(
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  );
  if (!session) throw new Error("OpenCode session not found");

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
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
  password: string | undefined,
  signal: AbortSignal,
  onEvent: (event: Event) => void,
  onConnected?: () => void,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  const subscription = await client.global.event({ signal });
  onConnected?.();

  for await (const streamedEvent of subscription.stream) {
    if (signal.aborted) break;

    const event = getStreamEventPayload(streamedEvent);
    if (event) onEvent(event);
  }
}

function getStreamEventPayload(streamedEvent: unknown): Event | undefined {
  if (!streamedEvent || typeof streamedEvent !== "object") return undefined;

  const envelope = streamedEvent as Record<string, unknown>;
  const candidate = envelope.payload ?? streamedEvent;
  if (!candidate || typeof candidate !== "object") return undefined;

  const event = candidate as Record<string, unknown>;
  if (
    typeof event.type !== "string" ||
    !event.properties ||
    typeof event.properties !== "object"
  ) {
    return undefined;
  }

  return candidate as Event;
}

async function findOpencodeSession(
  chatId: string,
  sessionId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  const projects = await getOpencodeProjectDirectories(
    chatId,
    serverUrl,
    accessToken,
    password,
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
  password?: string,
  directory?: string,
) {
  const normalizedServerUrl = normalizeOpencodeServerUrl(serverUrl);
  const cacheKey = `${connectionId}:${normalizedServerUrl}:${directory ?? ""}:${accessToken}:${password ?? ""}`;
  const existingClient = clients.get(cacheKey);
  if (existingClient) return existingClient;

  const client = createOpencodeClient({
    baseUrl: normalizedServerUrl,
    ...(directory === undefined ? {} : { directory }),
    headers: getOpencodeHeaders(accessToken, password),
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

function getOpencodeHeaders(
  accessToken: string,
  password?: string,
): HeadersInit {
  return {
    ...getProxyHeaders(accessToken),
    ...(password
      ? { authorization: `Basic ${btoa(`opencode:${password}`)}` }
      : {}),
  };
}

export function getOpencodePassword(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return undefined;
  }

  const password = (config as { opencodePassword?: unknown }).opencodePassword;
  return typeof password === "string" && password.trim() ? password : undefined;
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
