import {
  OpenCode,
  type OpenCodeClient,
  type SessionInfo,
  type SessionMessageInfo,
} from "@opencode/client";
import type {
  Event,
  Message,
  Part,
  QuestionAnswer,
  QuestionRequest,
  Session,
  SessionInputAdmitted,
  SessionStatus,
  SnapshotFileDiff,
} from "./opencode-types.js";
import {
  getProxyAuthorizationValue,
  PROXY_AUTHORIZATION_HEADER,
} from "./proxy-auth.js";

const clients = new Map<string, OpenCodeClient>();
const queuedStreamMessages = new Map<
  string,
  { sessionID: string; text: string }
>();
const OPENCODE_EVENT_STREAM_IDLE_TIMEOUT_MS = 45_000;
const OPENCODE_INVENTORY_REQUEST_TIMEOUT_MS = 5_000;

export type OpencodeSessionData = {
  session: Session;
  status: SessionStatus;
  messages: Array<{ info: Message; parts: Part[] }>;
  questions: QuestionRequest[];
  changes: SnapshotFileDiff[];
  optimistic?: boolean;
  promptError?: string | undefined;
  messagePage?:
    | {
        hasOlder: boolean;
        cursor?: string;
        oldestMessageId: string | undefined;
      }
    | undefined;
};

// File references are expanded into synthetic Read context by OpenCode.
// That context belongs to the model, not the displayed user question.
export function getOpencodeUserMessage(parts: Part[]) {
  let text = parts
    .flatMap((part) =>
      part.type === "text" && !part.ignored && !part.synthetic
        ? [part.text]
        : [],
    )
    .join("\n\n");
  const files = parts.flatMap((part) => {
    if (part.type !== "file" || part.mime.startsWith("image/")) return [];
    const path =
      part.source?.type === "file"
        ? part.source.path
        : (part.filename ?? part.url);
    return [{ id: part.id, path }];
  });
  return { text: text.trim(), files };
}

export function reduceOpencodeMessages(
  messages: OpencodeSessionData["messages"],
  event: Event,
  sessionId: string,
) {
  const nativeType = (event as { type: string }).type;
  const native = event.properties as unknown as Record<string, unknown>;
  if (native.sessionID === sessionId) {
    if (nativeType === "session.inbox.enqueued") {
      const item = native.item as
        | {
            type?: string;
            payload?: { text?: string };
            delivery?: "steer" | "queue";
          }
        | undefined;
      const messageID = native.inboxID;
      if (
        item?.type === "user" &&
        item.delivery === "queue" &&
        typeof messageID === "string"
      ) {
        queuedStreamMessages.set(messageID, {
          sessionID: sessionId,
          text: item.payload?.text ?? "",
        });
        return messages;
      }
      if (
        item?.type === "user" &&
        item.delivery !== "queue" &&
        typeof messageID === "string"
      ) {
        return [
          ...messages.filter(
            (message) => !message.info.id.startsWith("optimistic:"),
          ),
          {
            info: {
              id: messageID,
              sessionID: sessionId,
              role: "user" as const,
              time: { created: Date.now() },
              agent: "",
              model: { providerID: "", modelID: "" },
            },
            parts: [
              {
                id: `${messageID}:text`,
                sessionID: sessionId,
                messageID,
                type: "text" as const,
                text: item.payload?.text ?? "",
              },
            ],
          },
        ];
      }
    }

    if (
      nativeType === "session.inbox.delivered" &&
      typeof native.inboxID === "string"
    ) {
      const queued = queuedStreamMessages.get(native.inboxID);
      if (
        queued?.sessionID === sessionId &&
        !messages.some((message) => message.info.id === native.inboxID)
      ) {
        return [
          ...messages,
          {
            info: {
              id: native.inboxID,
              sessionID: sessionId,
              role: "user" as const,
              time: { created: Date.now() },
              agent: "",
              model: { providerID: "", modelID: "" },
            },
            parts: [
              {
                id: `${native.inboxID}:text`,
                sessionID: sessionId,
                messageID: native.inboxID,
                type: "text" as const,
                text: queued.text,
              },
            ],
          },
        ];
      }
    }

    if (
      nativeType === "session.step.started" &&
      typeof native.assistantMessageID === "string"
    ) {
      const model = native.model as
        | { id?: string; providerID?: string; variant?: string }
        | undefined;
      const parentID = messages.findLast(
        (message) => message.info.role === "user",
      )?.info.id;
      const existing = messages.find(
        (message) => message.info.id === native.assistantMessageID,
      );
      if (existing?.info.role === "assistant") {
        return messages.map((message) =>
          message.info.id === native.assistantMessageID &&
          message.info.role === "assistant"
            ? {
                ...message,
                info: {
                  ...message.info,
                  agent:
                    typeof native.agent === "string"
                      ? native.agent
                      : message.info.agent,
                  modelID: model?.id ?? message.info.modelID,
                  providerID: model?.providerID ?? message.info.providerID,
                  ...(model?.variant ? { variant: model.variant } : {}),
                },
              }
            : message,
        );
      }
      return [
        ...messages,
        {
          info: {
            id: native.assistantMessageID,
            sessionID: sessionId,
            role: "assistant" as const,
            time: { created: Date.now() },
            parentID: parentID ?? "",
            modelID: model?.id ?? "",
            providerID: model?.providerID ?? "",
            ...(model?.variant ? { variant: model.variant } : {}),
            mode: "primary",
            agent: typeof native.agent === "string" ? native.agent : "",
            path: { cwd: "", root: "" },
            cost: 0,
            tokens: {
              input: 0,
              output: 0,
              reasoning: 0,
              cache: { read: 0, write: 0 },
            },
          },
          parts: [],
        },
      ];
    }

    if (
      (nativeType === "session.text.started" ||
        nativeType === "session.reasoning.started") &&
      typeof native.assistantMessageID === "string" &&
      typeof native.ordinal === "number"
    ) {
      const partType = nativeType.includes("reasoning") ? "reasoning" : "text";
      const partID = `${native.assistantMessageID}:${partType}:${native.ordinal}`;
      return messages.map((message) =>
        message.info.id === native.assistantMessageID
          ? {
              ...message,
              parts: message.parts.some((part) => part.id === partID)
                ? message.parts
                : [
                    ...message.parts,
                    partType === "reasoning"
                      ? {
                          id: partID,
                          sessionID: sessionId,
                          messageID: native.assistantMessageID as string,
                          type: "reasoning" as const,
                          text: "",
                          time: { start: Date.now() },
                        }
                      : {
                          id: partID,
                          sessionID: sessionId,
                          messageID: native.assistantMessageID as string,
                          type: "text" as const,
                          text: "",
                        },
                  ],
            }
          : message,
      );
    }

    if (
      (nativeType === "session.text.delta" ||
        nativeType === "session.reasoning.delta" ||
        nativeType === "session.text.ended" ||
        nativeType === "session.reasoning.ended") &&
      typeof native.assistantMessageID === "string" &&
      typeof native.ordinal === "number"
    ) {
      const partType = nativeType.includes("reasoning") ? "reasoning" : "text";
      const partID = `${native.assistantMessageID}:${partType}:${native.ordinal}`;
      return messages.map((message) =>
        message.info.id === native.assistantMessageID
          ? {
              ...message,
              parts: message.parts.map((part) =>
                part.id === partID &&
                (part.type === "text" || part.type === "reasoning")
                  ? {
                      ...part,
                      text: nativeType.endsWith(".ended")
                        ? String(native.text ?? "")
                        : `${part.text}${String(native.delta ?? "")}`,
                      ...(part.type === "reasoning" &&
                      nativeType.endsWith(".ended")
                        ? { time: { ...part.time, end: Date.now() } }
                        : {}),
                    }
                  : part,
              ),
            }
          : message,
      );
    }

    if (
      (nativeType === "session.step.ended" ||
        nativeType === "session.step.failed") &&
      typeof native.assistantMessageID === "string"
    ) {
      return messages.map((message) =>
        message.info.id === native.assistantMessageID &&
        message.info.role === "assistant"
          ? {
              ...message,
              info: {
                ...message.info,
                time: { ...message.info.time, completed: Date.now() },
                cost: typeof native.cost === "number" ? native.cost : 0,
                ...(native.tokens && typeof native.tokens === "object"
                  ? { tokens: native.tokens as typeof message.info.tokens }
                  : {}),
              },
            }
          : message,
      );
    }
  }

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
  const nativeType = (event as { type: string }).type;
  const native = event.properties as unknown as Record<string, unknown>;
  if (native.sessionID === sessionId) {
    if (nativeType === "form.created") {
      const questions = normalizeV2Form(native as unknown as OpencodeForm);
      return questions.length
        ? {
            ...current,
            questions: [
              ...current.questions.filter(
                (question) => question.id !== questions[0]?.id,
              ),
              ...questions,
            ],
          }
        : current;
    }
    if (nativeType === "form.replied" || nativeType === "form.cancelled") {
      return {
        ...current,
        questions: current.questions.filter(
          (question) => question.id !== native.id,
        ),
      };
    }
    if (nativeType === "session.execution.started") {
      return { ...current, status: { type: "busy" } };
    }
    if (
      nativeType === "session.execution.succeeded" ||
      nativeType === "session.execution.failed" ||
      nativeType === "session.execution.interrupted"
    ) {
      return { ...current, status: { type: "idle" } };
    }
  }

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
        ? { optimistic: false, promptError: undefined }
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
    event.type === "session.model.selected" &&
    event.properties.sessionID === sessionId
  ) {
    return {
      ...current,
      session: { ...current.session, model: event.properties.model },
    };
  }

  if (
    event.type === "session.agent.selected" &&
    event.properties.sessionID === sessionId
  ) {
    return {
      ...current,
      session: { ...current.session, agent: event.properties.agent },
    };
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

export type OpencodeFileReference = {
  mention: string;
  path: string;
};

export type OpencodeModelOption = {
  id: string;
  providerID: string;
  modelID: string;
  name: string;
  providerName: string;
  variants: string[];
  contextLimit: number;
};

export type OpencodeAgentOption = {
  id: string;
  name: string;
  description?: string;
  mode: "subagent" | "primary" | "all";
};

export type OpencodeMcpStatus =
  | { status: "connected" }
  | { status: "pending" }
  | { status: "disabled" }
  | { status: "needs_auth" }
  | { status: "failed"; error: string };

export type OpencodeMcpServer = {
  name: string;
  status: OpencodeMcpStatus;
  integrationID?: string;
};

export type OpencodeMcpConfig =
  | {
      type: "local";
      command: string[];
      cwd?: string;
      environment?: Record<string, string>;
    }
  | {
      type: "remote";
      url: string;
      headers?: Record<string, string>;
      oauth?: false;
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

export type OpencodeQueuedPrompt = {
  id: string;
  sessionID: string;
  prompt: SessionInputAdmitted["prompt"] & {
    agents?: unknown[];
    metadata?: Record<string, unknown>;
    skills?: unknown[];
  };
  delivery: "queue";
  timeCreated: number;
};

type OpencodeForm = {
  id: string;
  sessionID: string;
  title: string;
  metadata?: Record<string, unknown>;
  fields: Array<{
    key: string;
    type: string;
    title?: string;
    description?: string;
    options?: Array<{ label: string; value: string; description?: string }>;
    custom?: boolean;
  }>;
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
  const result = await client.session.list({ limit: 100, order: "desc" });

  const sessionsById = new Map<string, Session>();
  for (const session of result.data) {
    sessionsById.set(session.id, normalizeV2Session(session));
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
  const result = await client.location.get();

  return [
    {
      id: result.project.id,
      worktree: result.directory,
      sandboxes: [],
    },
  ];
}

export async function getOpencodeSessionRaw(
  chatId: string,
  sessionId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
  messageLimit = 100,
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
  const [messagesResult, questions, activeResult, changes] = await Promise.all([
    client.message.list({
      sessionID: sessionId,
      limit: messageLimit,
      order: "desc",
    }),
    getOpencodeSessionForms(serverUrl, accessToken, password, sessionId),
    client.session.active(),
    client.vcs
      .diff({
        location: { directory: session.directory },
        mode: "working",
      })
      .then((result) => result.data)
      .catch(async (vcsError) => {
        // Older OpenCode servers may not expose VCS review yet. Their session
        // diff endpoint still provides the latest turn's snapshot changes.
        try {
          return await client.session.diff({ sessionID: sessionId });
        } catch (sessionError) {
          console.warn("Could not load OpenCode changes", {
            vcsError,
            sessionError,
          });
          return session.summary?.diffs ?? [];
        }
      }),
  ]);

  const rawMessages = [...messagesResult.data];
  let nextCursor = messagesResult.cursor.next ?? undefined;
  // Match the official app: avoid rendering an orphaned leading assistant
  // response when a page boundary splits it from its user prompt.
  for (
    let page = 1;
    page < 3 && nextCursor && leadingV2TurnNeedsParent(rawMessages);
    page += 1
  ) {
    const response = await client.message.list({
      sessionID: sessionId,
      limit: messageLimit,
      cursor: nextCursor,
    });
    rawMessages.push(...response.data);
    nextCursor = response.cursor.next ?? undefined;
  }

  const fetchedMessages = normalizeV2Messages(session, rawMessages.reverse());
  const messages = fetchedMessages;
  const hasOlder = nextCursor
    ? await opencodeCursorContainsUserMessage(
        client,
        sessionId,
        nextCursor,
        messageLimit,
      )
    : false;
  return {
    session,
    status: activeResult[sessionId]
      ? { type: "busy" as const }
      : { type: "idle" as const },
    messages,
    questions,
    changes,
    messagePage: {
      hasOlder,
      ...(hasOlder && nextCursor ? { cursor: nextCursor } : {}),
      oldestMessageId: messages[0]?.info.id,
    },
  };
}

export async function getOpencodeSessionMessages(
  chatId: string,
  session: Session,
  serverUrl: string,
  accessToken: string,
  password?: string,
  options?: { cursor?: string; limit?: number },
) {
  return (
    await getOpencodeSessionMessagePage(
      chatId,
      session,
      serverUrl,
      accessToken,
      password,
      options,
    )
  ).messages;
}

export async function getOpencodeSessionMessagePage(
  chatId: string,
  session: Session,
  serverUrl: string,
  accessToken: string,
  password?: string,
  options?: { cursor?: string; limit?: number },
) {
  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
    session.directory,
  );
  const rawMessages: SessionMessageInfo[] = [];
  let cursor = options?.cursor;
  do {
    const result = await client.message.list({
      sessionID: session.id,
      limit: options?.limit ?? 100,
      ...(cursor ? { cursor } : { order: "desc" as const }),
    });
    rawMessages.push(...result.data);
    cursor = result.cursor.next ?? undefined;
  } while (cursor && !rawMessages.some((message) => message.type === "user"));
  const nextCursor =
    cursor &&
    (await opencodeCursorContainsUserMessage(
      client,
      session.id,
      cursor,
      options?.limit ?? 100,
    ))
      ? cursor
      : undefined;

  return {
    messages: normalizeV2Messages(session, rawMessages.reverse()),
    cursor: nextCursor,
  };
}

async function opencodeCursorContainsUserMessage(
  client: OpenCodeClient,
  sessionID: string,
  initialCursor: string,
  limit: number,
) {
  let cursor: string | undefined = initialCursor;
  const visited = new Set<string>();
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const result = await client.message.list({ sessionID, limit, cursor });
    if (result.data.some((message) => message.type === "user")) return true;
    cursor = result.cursor.next ?? undefined;
  }
  return false;
}

export async function getOpencodeSessionStatuses(
  chatId: string,
  sessions: Session[],
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  const active = await client.session.active();
  return Object.fromEntries(
    sessions.map((session) => [
      session.id,
      active[session.id] ? { type: "busy" } : { type: "idle" },
    ]),
  ) as Record<string, SessionStatus>;
}

export async function getOpencodeQuestions(
  _chatId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const response = await fetch(
    `${normalizeOpencodeServerUrl(serverUrl)}/api/form/request`,
    { headers: getOpencodeHeaders(accessToken, password), cache: "no-store" },
  );
  if (!response.ok) throw new Error("Could not load OpenCode forms");
  const body = (await response.json()) as { data?: OpencodeForm[] };
  return (body.data ?? []).flatMap(normalizeV2Form);
}

async function getOpencodeSessionForms(
  serverUrl: string,
  accessToken: string,
  password: string | undefined,
  sessionId: string,
) {
  const response = await fetch(
    `${normalizeOpencodeServerUrl(serverUrl)}/api/session/${encodeURIComponent(sessionId)}/form`,
    { headers: getOpencodeHeaders(accessToken, password), cache: "no-store" },
  );
  if (!response.ok) throw new Error("Could not load OpenCode session forms");
  const body = (await response.json()) as { data?: OpencodeForm[] };
  return (body.data ?? []).flatMap(normalizeV2Form);
}

function normalizeV2Form(form: OpencodeForm): QuestionRequest[] {
  if (form.metadata?.kind !== "question") return [];
  const fields = form.fields.filter(
    (field) => field.type === "string" || field.type === "multiselect",
  );
  if (!fields.length) return [];
  return [
    {
      id: form.id,
      sessionID: form.sessionID,
      questions: fields.map((field) => ({
        header: field.title ?? form.title,
        question: field.description ?? field.title ?? form.title,
        options: (field.options ?? []).map((option) => ({
          label: option.label,
          description: option.description ?? option.label,
        })),
        multiple: field.type === "multiselect",
        custom: field.custom ?? true,
      })),
    },
  ];
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
  const result = await client.session.create({
    location: { directory: selectedDirectory },
  });

  return normalizeV2Session(result);
}

export async function getOpencodeInventory(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  const [providerResponse, modelsResponse, agentsResponse] = await Promise.all([
    getOpencodeInventoryResource("providers", (signal) =>
      client.provider.list({}, { signal }),
    ),
    getOpencodeInventoryResource("models", (signal) =>
      client.model.list({}, { signal }),
    ),
    getOpencodeInventoryResource("agents", (signal) =>
      client.agent.list({}, { signal }),
    ),
  ]);

  const providers = new Map(
    providerResponse.data.map((provider) => [provider.id, provider]),
  );
  const models = modelsResponse.data
    .filter((model) => model.enabled)
    .map((model) => ({
      id: `${model.providerID}/${model.id}`,
      providerID: model.providerID,
      modelID: model.id,
      name: model.name,
      providerName: providers.get(model.providerID)?.name ?? model.providerID,
      variants: model.variants.map((variant) => variant.id),
      contextLimit: model.limit.context,
    }));
  const hiddenAgentNames = new Set(["compaction", "title", "summary"]);
  const agents = agentsResponse.data
    .filter(
      (agent) => agent.mode === "primary" && !hiddenAgentNames.has(agent.id),
    )
    .map((agent) => ({
      id: agent.id,
      name: (agent as { name?: string }).name ?? agent.id,
      description: agent.description,
      mode: agent.mode,
    }));

  return {
    models,
    agents,
    defaultSelection: {
      model: models[0]?.id,
      agent: agents[0]?.id,
    },
  };
}

export async function findOpencodeFiles(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  query: string,
  directory?: string,
  password?: string,
) {
  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
    directory,
  );
  const result = await client.file.find({
    query,
    type: "file",
    limit: 30,
    ...(directory ? { location: { directory } } : {}),
  });
  return result.data.map((entry) => entry.path);
}

export type OpencodeProviderConnectMethod =
  | { id?: string; label: string; type: "key" }
  | { id: string; label: string; type: "oauth" };

export type OpencodeProviderIntegration = {
  connected: boolean;
  id: string;
  methods: OpencodeProviderConnectMethod[];
  name: string;
};

export async function getOpencodeProviderIntegrations(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  directory?: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  const result = await client.integration.list({
    ...(directory ? { location: { directory } } : {}),
  });
  return result.data.map((integration) => ({
    id: integration.id,
    name: integration.name,
    connected: integration.connections.length > 0,
    methods: integration.methods.flatMap<OpencodeProviderConnectMethod>(
      (method) => {
        if (method.type === "key") {
          return [{ type: "key" as const, label: method.label ?? "API key" }];
        }
        if (method.type === "oauth") {
          return [
            { type: "oauth" as const, id: method.id, label: method.label },
          ];
        }
        return [];
      },
    ),
  }));
}

export async function connectOpencodeProviderKey(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  providerId: string,
  key: string,
  directory?: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  await client.integration.connect.key({
    integrationID: providerId,
    key,
    ...(directory ? { location: { directory } } : {}),
  });
}

export async function startOpencodeProviderOauth(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  providerId: string,
  methodId: string,
  directory?: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  return (
    await client.integration.oauth.connect({
      integrationID: providerId,
      methodID: methodId,
      ...(directory ? { location: { directory } } : {}),
    })
  ).data;
}

export async function getOpencodeProviderOauthStatus(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  providerId: string,
  attemptId: string,
  directory?: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  return (
    await client.integration.oauth.status({
      integrationID: providerId,
      attemptID: attemptId,
      ...(directory ? { location: { directory } } : {}),
    })
  ).data;
}

export async function completeOpencodeProviderOauth(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  providerId: string,
  attemptId: string,
  code: string,
  directory?: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  await client.integration.oauth.complete({
    integrationID: providerId,
    attemptID: attemptId,
    code,
    ...(directory ? { location: { directory } } : {}),
  });
}

async function getOpencodeInventoryResource<T>(
  resource: string,
  request: (signal: AbortSignal) => Promise<T>,
) {
  const signal = AbortSignal.timeout(OPENCODE_INVENTORY_REQUEST_TIMEOUT_MS);

  try {
    return await request(signal);
  } catch (error) {
    if (signal.aborted) {
      throw new Error(
        `OpenCode ${resource} request timed out after ${OPENCODE_INVENTORY_REQUEST_TIMEOUT_MS / 1000}s`,
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not load OpenCode ${resource}: ${message}`);
  }
}

export async function sendOpencodePrompt(
  chatId: string,
  sessionId: string,
  text: string,
  attachments: UploadAttachment[],
  fileReferences: OpencodeFileReference[],
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
  const files = [
    ...fileReferences.map((reference) => {
      const start = text.indexOf(reference.mention);
      const absolutePath = reference.path.startsWith("/")
        ? reference.path
        : `${session.directory.replace(/\/$/, "")}/${reference.path}`;
      return {
        uri: `file://${absolutePath
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/")}`,
        name: reference.path.split("/").pop() ?? reference.path,
        source: {
          text: reference.mention,
          start: Math.max(0, start),
          end: Math.max(0, start) + reference.mention.length,
        },
      };
    }),
    ...attachments.map((attachment) => ({
      uri: attachment.dataUrl,
      name: attachment.name,
    })),
  ];
  const model = parseModelSelection(selection.model);
  if (model) {
    await client.session.switchModel({
      sessionID: sessionId,
      model: {
        id: model.modelID,
        providerID: model.providerID,
        ...(selection.variant ? { variant: selection.variant } : {}),
      },
    });
  }
  if (selection.agent) {
    await client.session.switchAgent({
      sessionID: sessionId,
      agent: selection.agent,
    });
  }
  await postV2Prompt(serverUrl, accessToken, password, sessionId, {
    text,
    ...(files.length ? { files } : {}),
    delivery: "steer",
  });
}

export async function queueOpencodePrompt(
  chatId: string,
  sessionId: string,
  text: string,
  attachments: UploadAttachment[],
  fileReferences: OpencodeFileReference[],
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
  const model = parseModelSelection(selection.model);
  if (model) {
    await client.session.switchModel({
      sessionID: sessionId,
      model: {
        id: model.modelID,
        providerID: model.providerID,
        ...(selection.variant ? { variant: selection.variant } : {}),
      },
    });
  }
  if (selection.agent) {
    await client.session.switchAgent({
      sessionID: sessionId,
      agent: selection.agent,
    });
  }

  const files = [
    ...fileReferences.map((reference) => {
      const start = text.indexOf(reference.mention);
      const absolutePath = reference.path.startsWith("/")
        ? reference.path
        : `${session.directory.replace(/\/$/, "")}/${reference.path}`;
      return {
        uri: `file://${absolutePath
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/")}`,
        name: reference.path.split("/").pop() ?? reference.path,
        source: {
          text: reference.mention,
          start: Math.max(0, start),
          end: Math.max(0, start) + reference.mention.length,
        },
      };
    }),
    ...attachments.map((attachment) => ({
      uri: attachment.dataUrl,
      name: attachment.name,
    })),
  ];
  return postV2Prompt(serverUrl, accessToken, password, sessionId, {
    text,
    ...(files.length ? { files } : {}),
    delivery: "queue",
  });
}

async function postV2Prompt(
  serverUrl: string,
  accessToken: string,
  password: string | undefined,
  sessionId: string,
  payload: {
    text: string;
    files?: Array<{
      uri: string;
      name?: string;
      source?: { text: string; start: number; end: number };
    }>;
    agents?: unknown[];
    metadata?: Record<string, unknown>;
    resume?: boolean;
    skills?: unknown[];
    delivery: "steer" | "queue";
  },
) {
  const response = await fetch(
    `${normalizeOpencodeServerUrl(serverUrl)}/api/session/${encodeURIComponent(sessionId)}/prompt`,
    {
      method: "POST",
      headers: {
        ...getOpencodeHeaders(accessToken, password),
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      detail || `Could not send OpenCode prompt: ${response.status}`,
    );
  }
  const body = (await response.json()) as { data: SessionInputAdmitted };
  return body.data;
}

export async function getOpencodeQueuedPrompts(
  sessionId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
): Promise<OpencodeQueuedPrompt[]> {
  const response = await fetch(
    `${normalizeOpencodeServerUrl(serverUrl)}/api/session/${encodeURIComponent(sessionId)}/inbox`,
    {
      cache: "no-store",
      headers: getOpencodeHeaders(accessToken, password),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Could not load queued OpenCode prompts: ${response.status}`,
    );
  }

  const body = (await response.json()) as { data?: unknown };
  if (!Array.isArray(body.data)) return [];
  return body.data.flatMap(normalizeQueuedPrompt);
}

export async function cancelOpencodeQueuedPrompt(
  sessionId: string,
  inboxId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const response = await fetch(
    `${normalizeOpencodeServerUrl(serverUrl)}/api/session/${encodeURIComponent(sessionId)}/inbox/${encodeURIComponent(inboxId)}`,
    {
      method: "DELETE",
      headers: getOpencodeHeaders(accessToken, password),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      detail || `Could not remove queued OpenCode prompt: ${response.status}`,
    );
  }
}

export async function steerOpencodeQueuedPrompt(
  sessionId: string,
  inboxId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const response = await fetch(
    `${normalizeOpencodeServerUrl(serverUrl)}/api/session/${encodeURIComponent(sessionId)}/inbox/${encodeURIComponent(inboxId)}`,
    {
      method: "PATCH",
      headers: getOpencodeHeaders(accessToken, password),
      body: JSON.stringify({ delivery: "steer" }),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      detail || `Could not steer queued OpenCode prompt: ${response.status}`,
    );
  }
}

export async function reorderOpencodeQueuedPrompts(
  queuedPrompts: OpencodeQueuedPrompt[],
  inboxIds: string[],
  sessionId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const ordered = inboxIds.flatMap((id) =>
    queuedPrompts.filter((item) => item.id === id),
  );
  if (ordered.length !== queuedPrompts.length) {
    throw new Error("Queued prompts changed before they could be reordered");
  }

  const changedIndex = ordered.findIndex(
    (item, index) => item.id !== queuedPrompts[index]?.id,
  );
  if (changedIndex < 0) return;

  // Queue admission order determines delivery order, so these requests must
  // remain sequential. Every replacement is admitted before any original is
  // removed to avoid losing a prompt when admission fails.
  for (const item of ordered.slice(changedIndex)) {
    await postV2Prompt(serverUrl, accessToken, password, sessionId, {
      ...item.prompt,
      delivery: "queue",
      resume: false,
    });
  }
  for (const item of queuedPrompts.slice(changedIndex)) {
    await cancelOpencodeQueuedPrompt(
      sessionId,
      item.id,
      serverUrl,
      accessToken,
      password,
    );
  }
}

export async function editOpencodeQueuedPrompt(
  queuedPrompts: OpencodeQueuedPrompt[],
  inboxId: string,
  text: string,
  sessionId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const changedIndex = queuedPrompts.findIndex((item) => item.id === inboxId);
  if (changedIndex < 0) throw new Error("Queued prompt is no longer available");
  const edited = queuedPrompts.map((item) =>
    item.id === inboxId ? { ...item, prompt: { ...item.prompt, text } } : item,
  );
  for (const item of edited.slice(changedIndex)) {
    await postV2Prompt(serverUrl, accessToken, password, sessionId, {
      ...item.prompt,
      delivery: "queue",
      resume: false,
    });
  }
  for (const item of queuedPrompts.slice(changedIndex)) {
    await cancelOpencodeQueuedPrompt(
      sessionId,
      item.id,
      serverUrl,
      accessToken,
      password,
    );
  }
}

function normalizeQueuedPrompt(value: unknown): OpencodeQueuedPrompt[] {
  if (!value || typeof value !== "object") return [];
  const item = value as Record<string, unknown>;
  const payload = item.payload;
  if (
    item.type !== "user" ||
    item.delivery !== "queue" ||
    typeof item.id !== "string" ||
    typeof item.sessionID !== "string" ||
    !item.time ||
    typeof item.time !== "object" ||
    typeof (item.time as Record<string, unknown>).created !== "number" ||
    !payload ||
    typeof payload !== "object" ||
    typeof (payload as Record<string, unknown>).text !== "string"
  ) {
    return [];
  }

  return [
    {
      id: item.id,
      sessionID: item.sessionID,
      prompt: payload as SessionInputAdmitted["prompt"],
      delivery: "queue",
      timeCreated: (item.time as { created: number }).created,
    },
  ];
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
  await client.session.interrupt({ sessionID: sessionId });
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
  await client.session.revert.stage({
    sessionID: sessionId,
    messageID: messageId,
    files: true,
  });

  return session;
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
  await client.session.revert.clear({ sessionID: sessionId });

  return session;
}

export async function answerOpencodeQuestion(
  _chatId: string,
  sessionId: string,
  requestId: string,
  answers: QuestionAnswer[],
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const response = await fetch(
    `${normalizeOpencodeServerUrl(serverUrl)}/api/session/${encodeURIComponent(sessionId)}/form/${encodeURIComponent(requestId)}/reply`,
    {
      method: "POST",
      headers: {
        ...getOpencodeHeaders(accessToken, password),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        answer: Object.fromEntries(
          answers.map((answer, index) => [
            `q${index}`,
            answer.length === 1 ? answer[0] : answer,
          ]),
        ),
      }),
    },
  );
  if (!response.ok) {
    throw new Error("Could not submit the OpenCode question response");
  }
}

export async function rejectOpencodeQuestion(
  _chatId: string,
  sessionId: string,
  requestId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const response = await fetch(
    `${normalizeOpencodeServerUrl(serverUrl)}/api/session/${encodeURIComponent(sessionId)}/form/${encodeURIComponent(requestId)}/cancel`,
    {
      method: "POST",
      headers: getOpencodeHeaders(accessToken, password),
    },
  );
  if (!response.ok) {
    throw new Error("Could not dismiss the OpenCode question");
  }
}

export async function streamOpencodeEvents(
  _chatId: string,
  serverUrl: string,
  accessToken: string,
  password: string | undefined,
  signal: AbortSignal,
  onEvent: (event: Event) => void,
  onConnected?: () => void,
  eventFetch?: typeof globalThis.fetch,
) {
  // The generated OpenCode SDK's SSE helper calls global `fetch` internally,
  // ignoring the custom fetch configured on its client. Mobile must use
  // expo/fetch so response chunks are delivered as a real ReadableStream.
  const fetchEventStream = eventFetch ?? globalThis.fetch;
  const streamController = new AbortController();
  const abortStream = () => streamController.abort(signal.reason);
  if (signal.aborted) {
    abortStream();
  } else {
    signal.addEventListener("abort", abortStream, { once: true });
  }

  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      streamController.abort(
        new Error("OpenCode event stream stopped sending data"),
      );
    }, OPENCODE_EVENT_STREAM_IDLE_TIMEOUT_MS);
  };

  resetIdleTimer();
  let response: Response;
  try {
    response = await fetchEventStream(
      `${normalizeOpencodeServerUrl(serverUrl)}/api/event`,
      {
        cache: "no-store",
        headers: {
          ...getOpencodeHeaders(accessToken, password),
          accept: "text/event-stream",
        },
        signal: streamController.signal,
      },
    );
  } catch (error) {
    clearTimeout(idleTimer);
    signal.removeEventListener("abort", abortStream);
    throw error;
  }

  if (!response.ok) {
    clearTimeout(idleTimer);
    signal.removeEventListener("abort", abortStream);
    throw new Error(
      `OpenCode event stream failed: ${response.status} ${response.statusText}`,
    );
  }
  if (!response.body) {
    clearTimeout(idleTimer);
    signal.removeEventListener("abort", abortStream);
    throw new Error("OpenCode event stream response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    onConnected?.();
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      resetIdleTimer();
      buffer += decoder.decode(value, { stream: true });
      // Accept both LF and CRLF framing. Keeping an incomplete final event in
      // the buffer lets the next network chunk finish it.
      buffer = buffer.replace(/\r\n/g, "\n");

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const streamedEvent = parseServerSentEvent(block);
        const event = getStreamEventPayload(streamedEvent);
        if (event) onEvent(event);
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    clearTimeout(idleTimer);
    signal.removeEventListener("abort", abortStream);
    streamController.abort();
    try {
      await reader.cancel();
    } catch {
      // The fetch may already have closed or been aborted.
    }
    reader.releaseLock();
  }
}

function parseServerSentEvent(block: string): unknown {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""))
    .join("\n");

  if (!data) return undefined;

  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
}

function getStreamEventPayload(streamedEvent: unknown): Event | undefined {
  if (!streamedEvent || typeof streamedEvent !== "object") return undefined;

  const envelope = streamedEvent as Record<string, unknown>;
  const candidate = envelope.payload ?? streamedEvent;
  if (!candidate || typeof candidate !== "object") return undefined;

  const event = candidate as Record<string, unknown>;
  if (
    typeof event.type === "string" &&
    event.data &&
    typeof event.data === "object"
  ) {
    const data = event.data as Record<string, unknown>;
    const properties =
      event.type === "form.created" &&
      data.form &&
      typeof data.form === "object"
        ? data.form
        : data;
    // Native v2 events carry their payload in `data`; the existing event
    // reducers consume the same projected event payload as `properties`.
    return {
      type: event.type,
      properties,
    } as Event;
  }
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
  try {
    return normalizeV2Session(
      await client.session.get({ sessionID: sessionId }),
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "_tag" in error &&
      error._tag === "SessionNotFoundError"
    ) {
      return undefined;
    }
    throw new Error("Could not load OpenCode session", { cause: error });
  }
}

function normalizeV2Session(session: SessionInfo): Session {
  return {
    id: session.id,
    slug: session.id,
    projectID: session.projectID,
    directory: session.location.directory,
    ...(session.parentID ? { parentID: session.parentID } : {}),
    cost: session.cost,
    tokens: session.tokens,
    title: session.title?.trim() || "New chat",
    ...(session.agent ? { agent: session.agent } : {}),
    ...(session.model ? { model: session.model } : {}),
    version: "v2",
    time: session.time,
    ...(session.revert ? { revert: session.revert } : {}),
  };
}

function normalizeV2Messages(session: Session, messages: SessionMessageInfo[]) {
  const normalized: Array<{ info: Message; parts: Part[] }> = [];
  let currentUserMessageId: string | undefined;

  for (const message of messages) {
    if (message.type === "user") currentUserMessageId = message.id;
    const item = normalizeV2Message(session, message, currentUserMessageId);
    if (item) normalized.push(item);
  }

  return normalized;
}

function leadingV2TurnNeedsParent(messagesDescending: SessionMessageInfo[]) {
  const messages = messagesDescending.toReversed();
  const assistant = messages.findIndex(
    (message) => message.type === "assistant",
  );
  if (assistant === -1) return false;
  const boundary = messages.findIndex(
    (message) => message.type === "user" || message.type === "shell",
  );
  return boundary === -1 || assistant < boundary;
}

function normalizeV2Message(
  session: Session,
  message: SessionMessageInfo,
  parentID?: string,
): { info: Message; parts: Part[] } | undefined {
  if (message.type === "user") {
    const info: Message = {
      id: message.id,
      sessionID: session.id,
      role: "user",
      time: message.time,
      agent: session.agent ?? "",
      model: {
        providerID: session.model?.providerID ?? "",
        modelID: session.model?.id ?? "",
        ...(session.model?.variant ? { variant: session.model.variant } : {}),
      },
    };
    const parts: Part[] = [
      {
        id: `${message.id}:text`,
        sessionID: session.id,
        messageID: message.id,
        type: "text",
        text: message.text,
      },
      ...(message.files ?? []).map(
        (file, index): Part => ({
          id: `${message.id}:file:${index}`,
          sessionID: session.id,
          messageID: message.id,
          type: "file",
          mime: file.mime,
          ...(file.name ? { filename: file.name } : {}),
          url:
            file.source.type === "uri"
              ? file.source.uri
              : `data:${file.mime};base64,${file.data}`,
        }),
      ),
    ];
    return { info, parts };
  }

  if (message.type !== "assistant") return undefined;
  const info = {
    id: message.id,
    sessionID: session.id,
    role: "assistant",
    time: message.time,
    parentID: parentID ?? "",
    modelID: message.model.id,
    providerID: message.model.providerID,
    mode: "primary",
    agent: message.agent,
    path: { cwd: session.directory, root: session.directory },
    cost: message.cost ?? 0,
    tokens: message.tokens ?? {
      input: 0,
      output: 0,
      reasoning: 0,
      cache: { read: 0, write: 0 },
    },
    ...(message.model.variant ? { variant: message.model.variant } : {}),
    ...(message.finish ? { finish: message.finish } : {}),
  } as Message;
  const parts = message.content.map((content, index): Part => {
    const contentId =
      content.type === "tool"
        ? content.id
        : `${message.id}:${content.type}:${index}`;
    if (content.type === "text") {
      return {
        id: contentId,
        sessionID: session.id,
        messageID: message.id,
        type: "text",
        text: content.text,
      };
    }
    if (content.type === "reasoning") {
      return {
        id: contentId,
        sessionID: session.id,
        messageID: message.id,
        type: "reasoning",
        text: content.text,
        time: {
          start: content.time?.created ?? message.time.created,
          ...(content.time?.completed ? { end: content.time.completed } : {}),
        },
      };
    }
    return {
      id: contentId,
      sessionID: session.id,
      messageID: message.id,
      type: "tool",
      callID: contentId,
      tool: content.name,
      state: normalizeV2ToolState(
        content.state,
        content.time.created,
        content.name,
      ),
    } as Part;
  });
  return { info, parts };
}

function normalizeV2ToolState(
  state: Extract<
    SessionMessageInfo,
    { type: "assistant" }
  >["content"][number] extends infer Content
    ? Content extends { type: "tool"; state: infer ToolState }
      ? ToolState
      : never
    : never,
  created: number,
  toolName: string,
) {
  if (state.status === "streaming") {
    return { status: "pending" as const, input: {}, raw: state.input };
  }
  if (state.status === "running") {
    return {
      status: "running" as const,
      input: state.input,
      metadata: state.metadata,
      time: { start: created },
    };
  }
  if (state.status === "error") {
    return {
      status: "error" as const,
      input: state.input,
      error: state.error.message,
      metadata: state.metadata,
      time: { start: created, end: created },
    };
  }
  const text = state.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
  return {
    status: "completed" as const,
    input: state.input,
    output: text,
    title:
      toolName === "shell" || toolName === "bash"
        ? "Shell"
        : `${toolName.charAt(0).toUpperCase()}${toolName.slice(1)}`,
    metadata: state.metadata ?? {},
    time: { start: created, end: created },
    attachments: state.content.flatMap((item, index) =>
      item.type === "file"
        ? [
            {
              id: `tool-file:${index}`,
              sessionID: "",
              messageID: "",
              type: "file" as const,
              mime: item.mime,
              ...(item.name ? { filename: item.name } : {}),
              url: item.uri,
            },
          ]
        : [],
    ),
  };
}

export async function getOpencodeMcpServers(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  directory: string,
  password?: string,
) {
  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
    directory,
  );
  const result = await client.mcp.list({ location: { directory } });
  return [...result.data]
    .map((server) => server as OpencodeMcpServer)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function addOpencodeMcpServer(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  directory: string,
  name: string,
  config: OpencodeMcpConfig,
  password?: string,
) {
  const server = name.trim();
  if (!server) throw new Error("MCP server name is required");
  if (config.type === "local" && !config.command[0]?.trim()) {
    throw new Error("A local MCP command is required");
  }
  if (config.type === "remote") {
    const url = new URL(config.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Remote MCP URL must use HTTP or HTTPS");
    }
  }

  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
    directory,
  );
  await client.mcp.add({ server, config, location: { directory } });
}

export async function toggleOpencodeMcpServer(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  directory: string,
  name: string,
  password?: string,
) {
  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
    directory,
  );
  const location = { directory };
  const server = (await client.mcp.list({ location })).data.find(
    (item) => item.name === name,
  );
  if (!server) throw new Error(`MCP server ${name} was not found`);

  if (server.status.status === "pending") return {};
  if (server.status.status === "connected") {
    await client.mcp.disconnect({ server: name, location });
  } else if (server.status.status === "needs_auth") {
    if (!server.integrationID) {
      throw new Error(`MCP server ${name} has no authentication integration`);
    }
    const integration = await client.integration.get({
      integrationID: server.integrationID,
      location,
    });
    const method = integration.data?.methods.find(
      (item) => item.type === "oauth" && !item.form?.length,
    );
    if (!method || method.type !== "oauth") {
      throw new Error(`${name} requires an interactive authentication form`);
    }
    const attempt = await client.integration.oauth.connect({
      integrationID: server.integrationID,
      methodID: method.id,
      location,
    });
    return { authorizationUrl: attempt.data.url };
  } else {
    await client.mcp.connect({ server: name, location });
  }

  const current = (await client.mcp.list({ location })).data.find(
    (item) => item.name === name,
  );
  if (current?.status.status === "failed") {
    throw new Error(`${name}: ${current.status.error}`);
  }
  return {};
}

function getOpencodeClient(
  connectionId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
  directory?: string,
) {
  const normalizedServerUrl = normalizeOpencodeServerUrl(serverUrl);
  const cacheKey = `${connectionId}:${normalizedServerUrl}:${accessToken}:${password ?? ""}`;
  const existingClient = clients.get(cacheKey);
  if (existingClient) return existingClient;

  const client = OpenCode.make({
    baseUrl: normalizedServerUrl,
    headers: getOpencodeHeaders(accessToken, password),
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
