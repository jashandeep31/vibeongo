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
  PermissionRequest,
  QuestionAnswer,
  QuestionRequest,
  Session,
  SessionInputAdmitted,
  SessionStatus,
  SnapshotFileDiff,
  WebSearchProvider,
  WebSearchRequest,
  OpencodeError,
} from "./opencode-types.js";
import { normalizeOpencodeError } from "./opencode-errors.js";
import { isRuntimeRepositoryDirectory } from "./runtime-paths.js";
import {
  getProxyAuthorizationValue,
  PROXY_AUTHORIZATION_HEADER,
} from "./proxy-auth.js";

const clients = new Map<string, OpenCodeClient>();
const OPENCODE_EVENT_STREAM_IDLE_TIMEOUT_MS = 45_000;
const OPENCODE_INVENTORY_REQUEST_TIMEOUT_MS = 5_000;

export type OpencodePendingInboxItem = {
  id: string;
  sessionID: string;
  prompt: SessionInputAdmitted["prompt"] & {
    agents?: unknown[];
    metadata?: Record<string, unknown>;
    skills?: unknown[];
  };
  delivery: "queue" | "steer";
  timeCreated: number;
};

export type OpencodeSessionData = {
  session: Session;
  status: SessionStatus;
  messages: Array<{ info: Message; parts: Part[] }>;
  questions: QuestionRequest[];
  permissions: PermissionRequest[];
  webSearchRequests: WebSearchRequest[];
  changes: SnapshotFileDiff[];
  pendingInbox: OpencodePendingInboxItem[];
  optimistic?: boolean;
  promptError?: string | undefined;
  executionError?: OpencodeError | undefined;
  executionOutcome?: "succeeded" | "failed" | "interrupted" | undefined;
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
export function getOpencodeUserMessage(
  parts: Part[],
  metadata?: Record<string, unknown>,
) {
  let text = parts
    .flatMap((part) =>
      part.type === "text" && !part.ignored && !part.synthetic
        ? [part.text]
        : [],
    )
    .join("\n\n");
  if (typeof metadata?.displayText === "string") {
    text = metadata.displayText;
  } else {
    // Older uploads put server paths in the visible prompt text. Hide only lines
    // that match a file attachment in that same message.
    const uploadedPaths = new Set(
      parts.flatMap((part) =>
        part.type === "file" && part.url.startsWith("file://")
          ? [`Attached file: \`${decodeURIComponent(part.url.slice(7))}\``]
          : [],
      ),
    );
    const lines = text.split("\n");
    while (uploadedPaths.has(lines.at(-1) ?? "")) lines.pop();
    text = lines.join("\n");
  }
  const files = parts.flatMap((part) => {
    if (part.type !== "file" || part.mime.startsWith("image/")) return [];
    const path =
      part.source?.type === "file"
        ? part.source.path
        : (part.filename ?? part.url);
    return [{ id: part.id, path }];
  });
  const attachedFiles = Array.isArray(metadata?.attachments)
    ? metadata.attachments.flatMap((attachment) => {
        if (!attachment || typeof attachment !== "object") return [];
        const item = attachment as Record<string, unknown>;
        if (typeof item.path !== "string" || typeof item.name !== "string") {
          return [];
        }
        return [{ id: `attachment:${item.path}`, path: item.name }];
      })
    : [];
  return { text: text.trim(), files: [...files, ...attachedFiles] };
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
            payload?: { text?: string; metadata?: Record<string, unknown> };
            delivery?: "steer" | "queue";
          }
        | undefined;
      const messageID = native.inboxID;
      if (
        item?.type === "user" &&
        typeof messageID === "string"
      ) {
        // Match OpenCode's data model: admit the user message immediately and
        // let the timeline projection hide it while its inbox delivery is queue.
        const message = {
          info: {
            id: messageID,
            sessionID: sessionId,
            role: "user" as const,
            time: { created: event.created ?? Date.now() },
            agent: "",
            model: { providerID: "", modelID: "" },
            ...(item.payload?.metadata
              ? { metadata: item.payload.metadata }
              : {}),
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
        };
        const existingIndex = messages.findIndex(
          (entry) => entry.info.id === messageID,
        );
        if (existingIndex >= 0) {
          return messages.map((entry, index) =>
            index === existingIndex ? message : entry,
          );
        }
        return [
          ...messages.filter(
            (message) => !message.info.id.startsWith("optimistic:"),
          ),
          message,
        ];
      }
    }

    if (
      nativeType === "session.inbox.delivered" &&
      typeof native.inboxID === "string"
    ) {
      const deliveredIndex = messages.findIndex(
        (message) => message.info.id === native.inboxID,
      );
      if (deliveredIndex < 0) return messages;
      const delivered = messages[deliveredIndex]!;
      return [
        ...messages.slice(0, deliveredIndex),
        ...messages.slice(deliveredIndex + 1),
        {
          ...delivered,
          info: {
            ...delivered.info,
            time: {
              ...delivered.info.time,
              created: event.created ?? Date.now(),
            },
          },
        },
      ];
    }

    if (
      nativeType === "session.inbox.cancelled" &&
      typeof native.inboxID === "string"
    ) {
      return messages.filter(
        (message) =>
          message.info.id !== native.inboxID &&
          message.info.id !== `optimistic:${native.inboxID}`,
      );
    }

    if (
      (nativeType === "session.instructions.updated" ||
        nativeType === "session.synthetic") &&
      typeof native.text === "string" &&
      native.text.trim()
    ) {
      const isInstructionUpdate = nativeType === "session.instructions.updated";
      const syntheticDescription =
        typeof native.description === "string" && native.description.trim()
          ? native.description
          : undefined;
      // Synthetic text is model context (such as an AGENTS.md body), not
      // assistant prose. OpenCode's transcript displays its description.
      if (!isInstructionUpdate && !syntheticDescription) return messages;
      return appendTimelineText(
        messages,
        sessionId,
        event.id ?? `${nativeType}:${event.created ?? Date.now()}`,
        isInstructionUpdate
          ? getInstructionUpdateLabel(native)
          : syntheticDescription!,
        event.created,
        "notice",
        isInstructionUpdate ? "system" : "synthetic",
      );
    }

    if (
      nativeType === "session.skill.activated" &&
      typeof native.name === "string"
    ) {
      return appendTimelineText(
        messages,
        sessionId,
        event.id ?? `skill:${String(native.id ?? native.name)}`,
        `Skill ${native.name}`,
        event.created,
        "notice",
        "skill",
      );
    }

    if (nativeType === "session.moved") {
      const location = recordValue(native.location);
      const directory =
        typeof location?.directory === "string"
          ? location.directory
          : undefined;
      if (!directory) return messages;
      const subpath =
        typeof native.subpath === "string" ? `/${native.subpath}` : "";
      return appendTimelineText(
        messages,
        sessionId,
        event.id ?? `location:${event.created ?? Date.now()}`,
        `Moved to ${directory}${subpath}`,
        event.created,
        "notice",
        "location",
      );
    }

    if (nativeType === "session.shell.started") {
      const shell = recordValue(native.shell);
      if (!shell || typeof shell.id !== "string") return messages;
      return appendTimelineTool(
        messages,
        sessionId,
        event.id ?? `shell:${shell.id}`,
        {
          id: shell.id,
          name: "shell",
          input: {
            command: typeof shell.command === "string" ? shell.command : "",
          },
          ...(event.created === undefined ? {} : { occurredAt: event.created }),
        },
      );
    }

    if (nativeType === "session.shell.ended") {
      const shell = recordValue(native.shell);
      if (!shell || typeof shell.id !== "string") return messages;
      return updateTimelineTool(messages, shell.id, (tool) => ({
        ...tool,
        state:
          shell.status === "exited"
            ? {
                status: "completed",
                input: tool.state.input,
                output:
                  typeof recordValue(native.output)?.output === "string"
                    ? String(recordValue(native.output)?.output)
                    : "",
                title: "Shell",
                metadata: { exit: shell.exit },
                time: {
                  start:
                    tool.state.status === "running"
                      ? tool.state.time.start
                      : (event.created ?? Date.now()),
                  end: event.created ?? Date.now(),
                },
              }
            : {
                status: "error",
                input: tool.state.input,
                error: `Shell ${String(shell.status ?? "failed")}`,
                time: {
                  start:
                    tool.state.status === "running"
                      ? tool.state.time.start
                      : (event.created ?? Date.now()),
                  end: event.created ?? Date.now(),
                },
              },
      }));
    }

    if (nativeType === "session.compaction.started") {
      return appendTimelineText(
        messages,
        sessionId,
        `compaction:${
          typeof native.inputID === "string"
            ? native.inputID
            : (event.id ?? event.created ?? Date.now())
        }`,
        typeof native.recent === "string" && native.recent
          ? native.recent
          : "Compacting conversation context…",
        event.created,
      );
    }

    if (
      nativeType === "session.compaction.delta" ||
      nativeType === "session.compaction.ended" ||
      nativeType === "session.compaction.failed"
    ) {
      const text =
        nativeType === "session.compaction.failed"
          ? normalizeOpencodeError(native.error).message
          : String(native.text ?? "");
      const target = messages.findLast((message) =>
        message.info.id.startsWith("compaction:"),
      );
      if (!target) return messages;
      return messages.map((message) =>
        message.info.id === target.info.id
          ? {
              ...message,
              info:
                message.info.role === "assistant" &&
                nativeType === "session.compaction.failed"
                  ? {
                      ...message.info,
                      error: normalizeOpencodeError(native.error),
                    }
                  : message.info,
              parts: message.parts.map((part) =>
                part.type === "text"
                  ? {
                      ...part,
                      text:
                        nativeType === "session.compaction.delta"
                          ? `${part.text}${text}`
                          : text || part.text,
                    }
                  : part,
              ),
            }
          : message,
      );
    }

    if (
      nativeType === "session.step.started" &&
      typeof native.assistantMessageID === "string"
    ) {
      const started =
        typeof native.started === "number" ? native.started : Date.now();
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
                  time: { created: started },
                  error: undefined,
                  retry: undefined,
                  finish: undefined,
                  rawFinish: undefined,
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
            time: { created: started },
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
                          time: { start: event.created ?? Date.now() },
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
                        ? {
                            time: {
                              ...part.time,
                              end: event.created ?? Date.now(),
                            },
                          }
                        : {}),
                    }
                  : part,
              ),
            }
          : message,
      );
    }

    if (
      nativeType.startsWith("session.tool.") &&
      typeof native.assistantMessageID === "string" &&
      typeof native.id === "string"
    ) {
      return reduceV2ToolEvent(messages, event, sessionId);
    }

    if (
      nativeType === "session.step.streamed" &&
      typeof native.assistantMessageID === "string"
    ) {
      return messages.map((message) =>
        message.info.id === native.assistantMessageID &&
        message.info.role === "assistant"
          ? {
              ...message,
              info: {
                ...message.info,
                time: {
                  ...message.info.time,
                  streamed: event.created ?? Date.now(),
                },
              },
            }
          : message,
      );
    }

    if (
      nativeType === "session.retry.scheduled" &&
      typeof native.assistantMessageID === "string"
    ) {
      return messages.map((message) =>
        message.info.id === native.assistantMessageID &&
        message.info.role === "assistant"
          ? {
              ...message,
              info: {
                ...message.info,
                retry: {
                  attempt:
                    typeof native.attempt === "number" ? native.attempt : 1,
                  at: typeof native.at === "number" ? native.at : Date.now(),
                  error: normalizeOpencodeError(native.error),
                },
              },
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
                time: {
                  ...message.info.time,
                  completed: event.created ?? Date.now(),
                },
                cost:
                  typeof native.cost === "number"
                    ? native.cost
                    : message.info.cost,
                ...(native.tokens && typeof native.tokens === "object"
                  ? { tokens: native.tokens as typeof message.info.tokens }
                  : {}),
                ...(typeof native.finish === "string"
                  ? { finish: native.finish }
                  : nativeType === "session.step.failed"
                    ? { finish: "error" }
                    : {}),
                ...(typeof native.rawFinish === "string"
                  ? { rawFinish: native.rawFinish }
                  : {}),
                ...(native.providerState &&
                typeof native.providerState === "object"
                  ? {
                      providerState: native.providerState as Record<
                        string,
                        unknown
                      >,
                    }
                  : {}),
                ...(nativeType === "session.step.failed"
                  ? { error: normalizeOpencodeError(native.error) }
                  : {}),
                retry: undefined,
                snapshot: {
                  ...message.info.snapshot,
                  ...(typeof native.snapshot === "string"
                    ? { end: native.snapshot }
                    : {}),
                  ...(Array.isArray(native.files)
                    ? {
                        files: native.files.filter(
                          (file): file is string => typeof file === "string",
                        ),
                      }
                    : {}),
                },
              },
            }
          : message,
      );
    }

    if (nativeType === "session.execution.failed") {
      const assistant = messages.findLast(
        (message) => message.info.role === "assistant",
      );
      if (!assistant) return messages;
      return messages.map((message) =>
        message.info.id === assistant.info.id &&
        message.info.role === "assistant"
          ? {
              ...message,
              info: {
                ...message.info,
                error:
                  message.info.error ?? normalizeOpencodeError(native.error),
                finish: message.info.finish ?? "error",
                retry: undefined,
                time: {
                  ...message.info.time,
                  completed:
                    message.info.time.completed ?? event.created ?? Date.now(),
                },
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
    const info = event.properties.info as Message;
    const currentMessages =
      info.role === "user"
        ? messages.filter(
            (message) => !message.info.id.startsWith("optimistic:"),
          )
        : messages;
    const messageIndex = currentMessages.findIndex(
      (message) => message.info.id === info.id,
    );
    const nextMessages = [...currentMessages];

    if (messageIndex === -1) {
      nextMessages.push({ info, parts: [] });
    } else {
      nextMessages[messageIndex] = {
        info,
        parts: nextMessages[messageIndex]?.parts ?? [],
      };
    }

    return nextMessages;
  }

  if (
    event.type === "message.part.updated" &&
    event.properties.sessionID === sessionId
  ) {
    const updatedPart = event.properties.part as Part;
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
    const { messageID, partID, field, delta } = event.properties as {
      messageID: string;
      partID: string;
      field: string;
      delta: string;
    };
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

function reduceV2ToolEvent(
  messages: OpencodeSessionData["messages"],
  event: Event,
  sessionId: string,
) {
  const native = event.properties;
  const assistantMessageID = native.assistantMessageID as string;
  const toolID = native.id as string;
  const occurredAt = event.created ?? Date.now();

  return messages.map((message) => {
    if (message.info.id !== assistantMessageID) return message;

    const existing = message.parts.find(
      (part) => part.type === "tool" && part.id === toolID,
    );
    const fallback = {
      id: toolID,
      sessionID: sessionId,
      messageID: assistantMessageID,
      type: "tool" as const,
      callID: toolID,
      tool: typeof native.name === "string" ? native.name : "tool",
      state: {
        status: "pending" as const,
        input: {},
        raw: "",
      },
    };
    const tool = existing?.type === "tool" ? existing : fallback;
    const updated = reduceV2ToolPart(tool, event, occurredAt);
    return {
      ...message,
      parts: existing
        ? message.parts.map((part) => (part.id === toolID ? updated : part))
        : [...message.parts, updated],
    };
  });
}

function appendTimelineText(
  messages: OpencodeSessionData["messages"],
  sessionId: string,
  id: string,
  text: string,
  created = Date.now(),
  display?: "notice",
  noticeKind?: Extract<Extract<Part, { type: "text" }>["noticeKind"], string>,
  parentIDOverride?: string,
) {
  if (messages.some((message) => message.info.id === id)) return messages;
  const previous = messages.at(-1);
  const parentID =
    parentIDOverride ??
    (previous?.info.role === "assistant"
      ? previous.info.parentID
      : previous?.info.role === "user"
        ? previous.info.id
        : undefined);
  return [
    ...messages,
    {
      info: {
        id,
        sessionID: sessionId,
        role: "assistant" as const,
        time: { created },
        parentID: parentID ?? "",
        modelID: "",
        providerID: "",
        mode: "system",
        agent: "",
        path: { cwd: "", root: "" },
        cost: 0,
        tokens: emptyTokenUsage(),
      },
      parts: [
        {
          id: `${id}:text`,
          sessionID: sessionId,
          messageID: id,
          type: "text" as const,
          synthetic: true,
          ...(display ? { display } : {}),
          ...(noticeKind ? { noticeKind } : {}),
          text,
        },
      ],
    },
  ];
}

function getInstructionUpdateLabel(native: Record<string, unknown>) {
  const delta = recordValue(native.delta);
  const keys = delta ? Object.keys(delta) : [];
  return keys.length > 0
    ? `Instructions updated: ${keys.join(", ")}`
    : "Instructions updated";
}

function appendTimelineTool(
  messages: OpencodeSessionData["messages"],
  sessionId: string,
  messageID: string,
  input: {
    id: string;
    name: string;
    input: Record<string, unknown>;
    occurredAt?: number;
  },
) {
  const withMessage = appendTimelineText(
    messages,
    sessionId,
    messageID,
    "",
    input.occurredAt,
    undefined,
    undefined,
    `timeline:${messageID}`,
  );
  return withMessage.map((message) =>
    message.info.id === messageID
      ? {
          ...message,
          parts: [
            {
              id: input.id,
              sessionID: sessionId,
              messageID,
              type: "tool" as const,
              callID: input.id,
              tool: input.name,
              state: {
                status: "running" as const,
                input: input.input,
                time: { start: input.occurredAt ?? Date.now() },
              },
            },
          ],
        }
      : message,
  );
}

function updateTimelineTool(
  messages: OpencodeSessionData["messages"],
  toolID: string,
  update: (
    tool: Extract<Part, { type: "tool" }>,
  ) => Extract<Part, { type: "tool" }>,
) {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) =>
      part.type === "tool" && part.id === toolID ? update(part) : part,
    ),
  }));
}

function reduceV2ToolPart(
  tool: Extract<Part, { type: "tool" }>,
  event: Event,
  occurredAt: number,
): Extract<Part, { type: "tool" }> {
  const native = event.properties;
  if (event.type === "session.tool.input.started") {
    return {
      ...tool,
      tool: typeof native.name === "string" ? native.name : tool.tool,
      state: { status: "pending", input: {}, raw: "" },
    };
  }
  if (event.type === "session.tool.input.delta") {
    return tool.state.status === "pending"
      ? {
          ...tool,
          state: {
            ...tool.state,
            raw: `${tool.state.raw}${String(native.delta ?? "")}`,
          },
        }
      : tool;
  }
  if (event.type === "session.tool.input.ended") {
    return {
      ...tool,
      state: {
        status: "pending",
        input: parseToolInput(native.text),
        raw: typeof native.text === "string" ? native.text : "",
      },
    };
  }
  if (event.type === "session.tool.called") {
    return {
      ...tool,
      executed: native.executed === true,
      providerState: recordValue(native.state),
      state: {
        status: "running",
        input: recordValue(native.input) ?? {},
        metadata: {},
        time: { start: occurredAt, ran: occurredAt },
      },
    };
  }
  if (event.type === "session.tool.progress") {
    if (tool.state.status !== "running") return tool;
    return {
      ...tool,
      state: {
        ...tool.state,
        metadata: recordValue(native.metadata) ?? {},
      },
    };
  }
  if (event.type === "session.tool.success") {
    const content = arrayRecords(native.content);
    const input =
      tool.state.status === "pending" ? tool.state.input : tool.state.input;
    return {
      ...tool,
      executed: native.executed === true || tool.executed === true,
      providerResultState: recordValue(native.resultState),
      state: {
        status: "completed",
        input,
        output: content
          .flatMap((item) =>
            item.type === "text" && typeof item.text === "string"
              ? [item.text]
              : [],
          )
          .join("\n"),
        title: tool.tool,
        metadata: recordValue(native.metadata) ?? {},
        content,
        attachments: content.flatMap((item, index) =>
          item.type === "file" &&
          typeof item.uri === "string" &&
          typeof item.mime === "string"
            ? [
                {
                  id: `${tool.id}:attachment:${index}`,
                  sessionID: tool.sessionID,
                  messageID: tool.messageID,
                  type: "file" as const,
                  mime: item.mime,
                  url: item.uri,
                  ...(typeof item.name === "string"
                    ? { filename: item.name }
                    : {}),
                },
              ]
            : [],
        ),
        time: {
          start:
            tool.state.status === "running"
              ? tool.state.time.start
              : occurredAt,
          end: occurredAt,
        },
      },
    };
  }
  if (event.type === "session.tool.failed") {
    const error = normalizeOpencodeError(native.error);
    return {
      ...tool,
      executed: native.executed === true || tool.executed === true,
      providerResultState: recordValue(native.resultState),
      state: {
        status: "error",
        input: tool.state.input,
        error: error.message,
        structuredError: error,
        metadata: recordValue(native.metadata),
        content: arrayRecords(native.content),
        time: {
          start:
            tool.state.status === "running"
              ? tool.state.time.start
              : occurredAt,
          end: occurredAt,
        },
      },
    };
  }
  return tool;
}

function parseToolInput(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return recordValue(parsed) ?? {};
  } catch {
    return {};
  }
}

function recordValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function arrayRecords(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          recordValue(item) !== undefined,
      )
    : [];
}

export function reduceOpencodeSessionData(
  current: OpencodeSessionData,
  event: Event,
  sessionId: string,
): OpencodeSessionData {
  const nativeType = (event as { type: string }).type;
  const native = event.properties as unknown as Record<string, unknown>;
  if (native.sessionID === sessionId) {
    if (nativeType === "session.inbox.enqueued") {
      const item = recordValue(native.item);
      const id = native.inboxID;
      const payload = recordValue(item?.payload);
      if (
        item?.type === "user" &&
        typeof id === "string" &&
        typeof payload?.text === "string" &&
        (item.delivery === "queue" || item.delivery === "steer")
      ) {
        const pending: OpencodePendingInboxItem = {
          id,
          sessionID: sessionId,
          prompt: payload as OpencodePendingInboxItem["prompt"],
          delivery: item.delivery,
          timeCreated: event.created ?? Date.now(),
        };
        return {
          ...current,
          pendingInbox: [
            ...(current.pendingInbox ?? []).filter(
              (pending) => pending.id !== id,
            ),
            pending,
          ],
          messages: reduceOpencodeMessages(current.messages, event, sessionId),
        };
      }
    }
    if (
      (nativeType === "session.inbox.delivered" ||
        nativeType === "session.inbox.cancelled") &&
      typeof native.inboxID === "string"
    ) {
      return {
        ...current,
        pendingInbox: (current.pendingInbox ?? []).filter(
          (pending) => pending.id !== native.inboxID,
        ),
        messages: reduceOpencodeMessages(current.messages, event, sessionId),
      };
    }
    if (
      nativeType === "session.inbox.delivery.changed" &&
      typeof native.inboxID === "string" &&
      (native.delivery === "queue" || native.delivery === "steer")
    ) {
      return {
        ...current,
        pendingInbox: (current.pendingInbox ?? []).map((pending) =>
          pending.id === native.inboxID
            ? { ...pending, delivery: native.delivery as "queue" | "steer" }
            : pending,
        ),
      };
    }
    if (nativeType === "form.created") {
      const form = normalizeV2Form(native as unknown as OpencodeForm);
      if (!form.questions.length && !form.webSearchRequests.length) {
        return current;
      }
      return {
        ...current,
        questions: [
          ...current.questions.filter(
            (question) => question.id !== form.questions[0]?.id,
          ),
          ...form.questions,
        ],
        webSearchRequests: [
          ...current.webSearchRequests.filter(
            (request) => request.id !== form.webSearchRequests[0]?.id,
          ),
          ...form.webSearchRequests,
        ],
      };
    }
    if (nativeType === "form.replied" || nativeType === "form.cancelled") {
      return {
        ...current,
        questions: current.questions.filter(
          (question) => question.id !== native.id,
        ),
        webSearchRequests: current.webSearchRequests.filter(
          (request) => request.id !== native.id,
        ),
      };
    }
    if (nativeType === "session.execution.started") {
      return {
        ...current,
        status: { type: "busy" },
        executionError: undefined,
        executionOutcome: undefined,
      };
    }
    if (
      nativeType === "session.execution.succeeded" ||
      nativeType === "session.execution.failed" ||
      nativeType === "session.execution.interrupted"
    ) {
      return {
        ...current,
        messages: reduceOpencodeMessages(current.messages, event, sessionId),
        status: { type: "idle" },
        executionOutcome:
          nativeType === "session.execution.succeeded"
            ? "succeeded"
            : nativeType === "session.execution.failed"
              ? "failed"
              : "interrupted",
        ...(nativeType === "session.execution.failed"
          ? { executionError: normalizeOpencodeError(native.error) }
          : { executionError: undefined }),
      };
    }
    if (nativeType === "session.revert.staged") {
      const revert = recordValue(native.revert);
      return revert && typeof revert.messageID === "string"
        ? {
            ...current,
            session: {
              ...current.session,
              revert: revert as NonNullable<Session["revert"]>,
            },
          }
        : current;
    }
    if (
      nativeType === "session.revert.cleared" ||
      nativeType === "session.revert.committed"
    ) {
      const { revert: _revert, ...session } = current.session;
      const boundary = typeof native.to === "string" ? native.to : undefined;
      return {
        ...current,
        session,
        ...(nativeType === "session.revert.committed" && boundary
          ? {
              messages: current.messages.filter(
                (message) => message.info.id < boundary,
              ),
            }
          : {}),
      };
    }
  }

  if (nativeType === "permission.asked" && native.sessionID === sessionId) {
    const permission = normalizePermissionRequest(
      native as unknown as PermissionRequest,
    );
    return {
      ...current,
      permissions: [
        ...current.permissions.filter((item) => item.id !== permission.id),
        permission,
      ],
    };
  }

  if (
    nativeType === "permission.replied" &&
    native.sessionID === sessionId &&
    typeof native.requestID === "string"
  ) {
    return {
      ...current,
      permissions: current.permissions.filter(
        (item) => item.id !== native.requestID,
      ),
    };
  }

  if (
    event.type === "question.asked" &&
    event.properties.sessionID === sessionId
  ) {
    const question = event.properties as unknown as QuestionRequest;
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
    const selectedSession =
      event.type === "session.model.selected"
        ? {
            ...current.session,
            model: event.properties.model as NonNullable<Session["model"]>,
          }
        : event.type === "session.agent.selected"
          ? {
              ...current.session,
              agent: event.properties.agent as string,
            }
          : event.type === "session.moved" &&
              recordValue(event.properties.location) &&
              typeof recordValue(event.properties.location)?.directory ===
                "string"
            ? {
                ...current.session,
                directory: recordValue(event.properties.location)!
                  .directory as string,
              }
            : current.session;
    return {
      ...current,
      session: selectedSession,
      messages,
      ...(event.type === "message.updated" &&
      (event.properties.info as Message).role === "user"
        ? { optimistic: false, promptError: undefined }
        : {}),
    };
  }

  if (
    event.type === "session.status" &&
    event.properties.sessionID === sessionId
  ) {
    return {
      ...current,
      status: event.properties.status as SessionStatus,
    };
  }

  if (
    (event.type === "session.idle" || event.type === "session.error") &&
    event.properties.sessionID === sessionId
  ) {
    return {
      ...current,
      status: { type: "idle" },
      ...(event.type === "session.error"
        ? {
            executionOutcome: "failed",
            executionError: normalizeOpencodeError(event.properties.error),
          }
        : {
            executionOutcome:
              event.properties.outcome === "failed" ||
              event.properties.outcome === "interrupted"
                ? event.properties.outcome
                : "succeeded",
            executionError: undefined,
          }),
    };
  }

  if (
    event.type === "session.model.selected" &&
    event.properties.sessionID === sessionId
  ) {
    return {
      ...current,
      session: {
        ...current.session,
        model: event.properties.model as NonNullable<Session["model"]>,
      },
    };
  }

  if (
    event.type === "session.agent.selected" &&
    event.properties.sessionID === sessionId
  ) {
    return {
      ...current,
      session: {
        ...current.session,
        agent: event.properties.agent as string,
      },
    };
  }

  if (
    event.type === "session.usage.updated" &&
    event.properties.sessionID === sessionId
  ) {
    return {
      ...current,
      session: {
        ...current.session,
        cost: event.properties.cost as number,
        tokens: event.properties.tokens as NonNullable<Session["tokens"]>,
      },
    };
  }

  if (
    event.type === "session.updated" &&
    event.properties.sessionID === sessionId
  ) {
    return { ...current, session: event.properties.info as Session };
  }

  if (
    event.type === "session.diff" &&
    event.properties.sessionID === sessionId
  ) {
    return {
      ...current,
      changes: event.properties.diff as SnapshotFileDiff[],
    };
  }

  return current;
}

export type UploadAttachment = {
  type: "image" | "text" | "pdf" | "file";
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

export type OpencodeQueuedPrompt = OpencodePendingInboxItem & {
  delivery: "queue";
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
    hidden?: boolean;
  }>;
};

type OpencodeSessionForms = {
  questions: QuestionRequest[];
  webSearchRequests: WebSearchRequest[];
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
  const [messagesResult, forms, permissions, activeResult, changes, inbox] =
    await Promise.all([
      client.message.list({
        sessionID: sessionId,
        limit: messageLimit,
        order: "desc",
      }),
      getOpencodeSessionForms(serverUrl, accessToken, password, sessionId),
      client.permission.list({ sessionID: sessionId }),
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
      getOpencodePendingInbox(serverUrl, accessToken, password, sessionId),
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
    questions: forms.questions,
    permissions: permissions.map(normalizePermissionRequest),
    webSearchRequests: forms.webSearchRequests,
    changes,
    pendingInbox: inbox,
    messagePage: {
      hasOlder,
      ...(hasOlder && nextCursor ? { cursor: nextCursor } : {}),
      oldestMessageId: messages[0]?.info.id,
    },
  };
}

async function getOpencodePendingInbox(
  serverUrl: string,
  accessToken: string,
  password: string | undefined,
  sessionId: string,
): Promise<OpencodePendingInboxItem[]> {
  const response = await fetch(
    `${normalizeOpencodeServerUrl(serverUrl)}/api/session/${encodeURIComponent(sessionId)}/inbox`,
    {
      cache: "no-store",
      headers: getOpencodeHeaders(accessToken, password),
    },
  );
  if (!response.ok) return [];
  const body = (await response.json()) as { data?: unknown };
  if (!Array.isArray(body.data)) return [];
  return body.data.flatMap(normalizePendingInboxItem);
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

function normalizePermissionRequest(request: {
  id: string;
  sessionID: string;
  action: string;
  resources: string[];
  save?: string[];
  message?: string;
  metadata?: Record<string, unknown>;
}): PermissionRequest {
  return {
    id: request.id,
    sessionID: request.sessionID,
    action: request.action,
    resources: request.resources,
    ...(request.save ? { save: request.save } : {}),
    ...(request.message ? { message: request.message } : {}),
    ...(request.metadata ? { metadata: request.metadata } : {}),
  };
}

export async function replyOpencodePermission(
  chatId: string,
  sessionId: string,
  requestId: string,
  decision: "once" | "always" | "reject",
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  await client.permission.reply({
    sessionID: sessionId,
    requestID: requestId,
    decision,
  });
}

export async function getOpencodeWebSearchProviders(
  chatId: string,
  directory: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
): Promise<WebSearchProvider[]> {
  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
    directory,
  );
  const result = await client.websearch.providers({
    location: { directory },
  });
  return result.data;
}

export async function replyOpencodeWebSearchRequest(
  chatId: string,
  request: WebSearchRequest,
  selection: string | false,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  const answer = request.specific
    ? { provider: selection }
    : {
        choice:
          selection === false
            ? "disable"
            : selection === "random"
              ? "allow"
              : "choose",
      };
  await client.session.form.reply({
    sessionID: request.sessionID,
    formID: request.id,
    answer,
  });
}

export async function forkOpencodeSession(
  chatId: string,
  sessionId: string,
  before: string | undefined,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  return normalizeV2Session(
    await client.session.fork({ sessionID: sessionId, before }),
  );
}

export async function deleteOpencodeSession(
  chatId: string,
  sessionId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  await client.session.remove({ sessionID: sessionId });
}

export async function exportOpencodeSession(
  chatId: string,
  sessionId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) {
  const client = getOpencodeClient(chatId, serverUrl, accessToken, password);
  return client.session.export({ sessionID: sessionId });
}

export function getOpencodeSessionExportFilename(session: {
  id: string;
  title?: string;
  slug?: string;
}) {
  const clean = (session.title || session.slug || session.id)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `${clean || session.id}.json`;
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
  return (body.data ?? []).flatMap((form) => normalizeV2Form(form).questions);
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
  return (body.data ?? []).reduce<OpencodeSessionForms>(
    (result, form) => {
      const normalized = normalizeV2Form(form);
      result.questions.push(...normalized.questions);
      result.webSearchRequests.push(...normalized.webSearchRequests);
      return result;
    },
    { questions: [], webSearchRequests: [] },
  );
}

function normalizeV2Form(form: OpencodeForm): OpencodeSessionForms {
  if (form.metadata?.kind === "websearch.provider") {
    const provider = form.fields.find(
      (field) =>
        field.type === "string" &&
        field.key === "provider" &&
        field.options?.length,
    );
    return {
      questions: [],
      webSearchRequests: [
        {
          id: form.id,
          sessionID: form.sessionID,
          title: form.title,
          specific: Boolean(provider),
          options: provider?.options ?? [],
          metadata: form.metadata,
        },
      ],
    };
  }
  if (form.metadata?.kind !== "question") {
    return { questions: [], webSearchRequests: [] };
  }
  const fields = form.fields.filter(
    (field) =>
      !field.hidden &&
      (field.type === "string" || field.type === "multiselect"),
  );
  if (!fields.length) return { questions: [], webSearchRequests: [] };
  return {
    webSearchRequests: [],
    questions: [
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
    ],
  };
}

export async function createOpencodeSession(
  chatId: string,
  serverUrl: string,
  accessToken: string,
  directory?: string,
  password?: string,
) {
  if (directory && !isRuntimeRepositoryDirectory(directory)) {
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
  const preparedAttachments = await prepareOpencodeAttachments(
    client,
    session.directory,
    attachments,
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
    ...preparedAttachments.files,
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
    text: [text, ...preparedAttachments.references].filter(Boolean).join("\n"),
    ...(files.length ? { files } : {}),
    metadata: {
      displayText: text,
      comments: [],
      attachments: preparedAttachments.attachments,
    },
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

  const model = parseModelSelection(selection.model);
  const client = getOpencodeClient(
    chatId,
    serverUrl,
    accessToken,
    password,
    session.directory,
  );
  const preparedAttachments = await prepareOpencodeAttachments(
    client,
    session.directory,
    attachments,
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
    ...preparedAttachments.files,
  ];
  return postV2Prompt(serverUrl, accessToken, password, sessionId, {
    text: [text, ...preparedAttachments.references].filter(Boolean).join("\n"),
    ...(files.length ? { files } : {}),
    metadata: {
      displayText: text,
      comments: [],
      attachments: preparedAttachments.attachments,
      ...(selection.agent ? { agent: selection.agent } : {}),
      ...(model
        ? {
            model: {
              id: model.modelID,
              providerID: model.providerID,
              ...(selection.variant ? { variant: selection.variant } : {}),
            },
          }
        : {}),
    },
    delivery: "queue",
    resume: false,
  });
}

async function prepareOpencodeAttachments(
  client: ReturnType<typeof getOpencodeClient>,
  directory: string,
  attachments: UploadAttachment[],
) {
  const temporaryRoot = attachments.some(
    (attachment) => attachment.type === "file",
  )
    ? (await client.server.info()).paths.tmp
    : undefined;
  const prepared = await Promise.all(
    attachments.map(async (attachment, index) => {
      if (attachment.type !== "file") {
        return {
          file: { uri: attachment.dataUrl, name: attachment.name },
          reference: undefined,
          attachment: undefined,
        };
      }
      const encoded = attachment.dataUrl.split(",", 2)[1];
      if (!encoded || !temporaryRoot) {
        throw new Error(`Could not upload ${attachment.name}`);
      }
      const bytes = Uint8Array.from(atob(encoded), (character) =>
        character.charCodeAt(0),
      );
      const name =
        attachment.name.split(/[\\/]/).at(-1)?.replace(/[`\r\n]/g, "_") ||
        "attachment";
      const path = `${temporaryRoot}/uploads/${Date.now()}-${Math.random().toString(36).slice(2)}-${index}/${name}`;
      const uploaded = await client.file.write({
        location: { directory },
        path,
        payload: bytes,
      });
      return {
        file: undefined,
        reference: `Attached file: \`${uploaded.data.path}\``,
        attachment: { name, mime: attachment.mimeType, path: uploaded.data.path },
      };
    }),
  );
  return {
    files: prepared.flatMap((item) => (item.file ? [item.file] : [])),
    references: prepared.flatMap((item) =>
      item.reference ? [item.reference] : [],
    ),
    attachments: prepared.flatMap((item) =>
      item.attachment ? [item.attachment] : [],
    ),
  };
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
  const client = getOpencodeClient(
    sessionId,
    serverUrl,
    accessToken,
    password,
  );
  await client.session.inbox.update({
    sessionID: sessionId,
    inboxID: inboxId,
    delivery: "steer",
  });
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

function normalizePendingInboxItem(
  value: unknown,
): OpencodePendingInboxItem[] {
  if (!value || typeof value !== "object") return [];
  const item = value as Record<string, unknown>;
  const payload = item.payload;
  if (
    item.type !== "user" ||
    (item.delivery !== "queue" && item.delivery !== "steer") ||
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
      delivery: item.delivery,
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
    `${normalizeOpencodeServerUrl(serverUrl)}/api/session/${encodeURIComponent(sessionId)}/form/${encodeURIComponent(requestId)}`,
    {
      method: "DELETE",
      headers: getOpencodeHeaders(accessToken, password),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Could not dismiss the OpenCode question");
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
      ...(typeof event.id === "string" ? { id: event.id } : {}),
      ...(typeof event.created === "number" ? { created: event.created } : {}),
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
  let currentTimelineParentId: string | undefined;
  const firstAgentSwitch = messages.find(
    (
      message,
    ): message is Extract<SessionMessageInfo, { type: "agent-switched" }> =>
      message.type === "agent-switched",
  );
  const firstModelSwitch = messages.find(
    (
      message,
    ): message is Extract<SessionMessageInfo, { type: "model-switched" }> =>
      message.type === "model-switched",
  );
  let agent = firstAgentSwitch?.previous ?? session.agent ?? "";
  let model = firstModelSwitch?.previous ?? session.model;

  for (const message of messages) {
    if (message.type === "user") currentTimelineParentId = message.id;
    const item = normalizeV2Message(session, message, currentTimelineParentId, {
      agent,
      model,
    });
    if (item) normalized.push(item);
    if (message.type === "shell") {
      currentTimelineParentId = `timeline:${message.id}`;
    }
    if (message.type === "agent-switched") agent = message.agent;
    if (message.type === "model-switched") model = message.model;
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
  selection: {
    agent: string;
    model: { id: string; providerID: string; variant?: string } | undefined;
  } = { agent: session.agent ?? "", model: session.model },
): { info: Message; parts: Part[] } | undefined {
  if (message.type === "user") {
    const info: Message = {
      id: message.id,
      sessionID: session.id,
      role: "user",
      time: message.time,
      agent: selection.agent,
      model: {
        providerID: selection.model?.providerID ?? "",
        modelID: selection.model?.id ?? "",
        ...(selection.model?.variant
          ? { variant: selection.model.variant }
          : {}),
      },
      ...(message.metadata ? { metadata: message.metadata } : {}),
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

  if (message.type !== "assistant") {
    const info: Message = {
      id: message.id,
      sessionID: session.id,
      role: "assistant",
      time: message.time,
      parentID: parentID ?? "",
      modelID: selection.model?.id ?? "",
      providerID: selection.model?.providerID ?? "",
      mode: "system",
      agent: selection.agent,
      path: { cwd: session.directory, root: session.directory },
      cost: 0,
      tokens: emptyTokenUsage(),
    };
    if (message.type === "shell") {
      return {
        info: { ...info, parentID: `timeline:${message.id}` },
        parts: [
          {
            id: `${message.id}:shell`,
            sessionID: session.id,
            messageID: message.id,
            type: "tool",
            callID: message.shellID,
            tool: "shell",
            state: normalizeV2ShellState(message),
          },
        ],
      };
    }
    if (message.type === "compaction") {
      return {
        info: {
          ...info,
          ...(message.status === "failed"
            ? { error: normalizeOpencodeError(message.error) }
            : {}),
        },
        parts: [
          {
            id: `${message.id}:compaction`,
            sessionID: session.id,
            messageID: message.id,
            type: "text",
            synthetic: true,
            display: "notice",
            noticeKind: "compaction",
            text:
              message.status === "running"
                ? "Compacting conversation context…"
                : message.status === "completed"
                  ? message.summary || "Conversation context compacted."
                  : "Conversation compaction failed.",
          },
        ],
      };
    }
    if (
      message.type === "system" ||
      message.type === "synthetic" ||
      message.type === "skill"
    ) {
      return {
        info,
        parts: [
          {
            id: `${message.id}:text`,
            sessionID: session.id,
            messageID: message.id,
            type: "text",
            synthetic: true,
            display: "notice" as const,
            noticeKind: message.type,
            text:
              message.type === "system"
                ? (message.description ?? "Instructions updated")
                : message.type === "synthetic"
                  ? (message.description ?? "")
                  : `Skill ${message.name}`,
          },
        ],
      };
    }
    if (message.type === "location-switched") {
      const subpath = message.subpath ? `/${message.subpath}` : "";
      return timelineNotice(
        info,
        message.id,
        `Moved to ${message.location.directory}${subpath}`,
        "location",
      );
    }
    // Idle messages delimit execution turns but intentionally have no row.
    if (message.type === "idle") return undefined;
    return undefined;
  }
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
    ...(message.rawFinish ? { rawFinish: message.rawFinish } : {}),
    ...(message.providerState
      ? { providerState: message.providerState as Record<string, unknown> }
      : {}),
    ...(message.error ? { error: normalizeOpencodeError(message.error) } : {}),
    ...(message.retry
      ? {
          retry: {
            attempt: message.retry.attempt,
            at: message.retry.at,
            error: normalizeOpencodeError(message.retry.error),
          },
        }
      : {}),
    ...(message.snapshot ? { snapshot: message.snapshot } : {}),
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
        ...(content.state
          ? { metadata: content.state as Record<string, unknown> }
          : {}),
      };
    }
    if (content.type === "reasoning") {
      return {
        id: contentId,
        sessionID: session.id,
        messageID: message.id,
        type: "reasoning",
        text: content.text,
        ...(content.state
          ? { metadata: content.state as Record<string, unknown> }
          : {}),
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
      executed: content.executed,
      providerState: content.providerState as
        | Record<string, unknown>
        | undefined,
      providerResultState: content.providerResultState as
        | Record<string, unknown>
        | undefined,
      state: normalizeV2ToolState(content.state, content.time, content.name),
    } as Part;
  });
  return { info, parts };
}

function timelineNotice(
  info: Extract<Message, { role: "assistant" }>,
  id: string,
  text: string,
  noticeKind: Extract<Extract<Part, { type: "text" }>["noticeKind"], string>,
) {
  return {
    info,
    parts: [
      {
        id: `${id}:notice`,
        sessionID: info.sessionID,
        messageID: id,
        type: "text" as const,
        synthetic: true,
        display: "notice" as const,
        noticeKind,
        text,
      },
    ],
  };
}

function emptyTokenUsage() {
  return {
    input: 0,
    output: 0,
    reasoning: 0,
    cache: { read: 0, write: 0 },
  };
}

function normalizeV2ShellState(
  message: Extract<SessionMessageInfo, { type: "shell" }>,
): Extract<Part, { type: "tool" }>["state"] {
  const input = { command: message.command };
  if (message.status === "running") {
    return {
      status: "running",
      input,
      time: { start: message.time.created },
    };
  }
  const time = {
    start: message.time.created,
    end: message.time.completed ?? message.time.created,
  };
  if (message.status !== "exited") {
    return { status: "error", input, error: `Shell ${message.status}`, time };
  }
  if (typeof message.exit === "number" && message.exit !== 0) {
    return {
      status: "error",
      input,
      error: message.output?.output || `Shell exited with code ${message.exit}`,
      metadata: {
        exit: message.exit,
        ...(message.output
          ? {
              cursor: message.output.cursor,
              size: message.output.size,
              truncated: message.output.truncated,
            }
          : {}),
      },
      time,
    };
  }
  return {
    status: "completed",
    input,
    output: message.output?.output ?? "",
    title: "Shell",
    metadata: {
      ...(message.exit === undefined ? {} : { exit: message.exit }),
      ...(message.output
        ? {
            cursor: message.output.cursor,
            size: message.output.size,
            truncated: message.output.truncated,
          }
        : {}),
    },
    attachments: [],
    time,
  };
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
  time: { created: number; ran?: number; completed?: number },
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
      time: { start: time.created, ...(time.ran ? { ran: time.ran } : {}) },
    };
  }
  if (state.status === "error") {
    const error = normalizeOpencodeError(state.error);
    return {
      status: "error" as const,
      input: state.input,
      error: error.message,
      structuredError: error,
      metadata: state.metadata,
      content: state.content as Array<Record<string, unknown>> | undefined,
      time: { start: time.created, end: time.completed ?? time.created },
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
    content: state.content as Array<Record<string, unknown>>,
    time: { start: time.created, end: time.completed ?? time.created },
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
