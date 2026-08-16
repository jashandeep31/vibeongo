import type {
  OpencodeModelOption,
  OpencodePromptSelection,
  OpencodeSessionData,
} from "@repo/api-client";

export type SessionMessage = OpencodeSessionData["messages"][number];
export type SessionPart = SessionMessage["parts"][number];
export type ToolPart = Extract<SessionPart, { type: "tool" }>;
export type SnapshotFileDiff = OpencodeSessionData["changes"][number];

export type ChatContent =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "tools"; tools: ToolPart[] }
  | { id: string; type: "thinking"; active: boolean }
  | {
      id: string;
      type: "error";
      title: string;
      message: string;
      statusCode?: number;
    };

export type ChatTurn = {
  id: string;
  question: string;
  images: Array<{ id: string; url: string; name: string }>;
  summaryDiffs: SnapshotFileDiff[];
  content: ChatContent[];
  agent?: string;
  provider?: string;
  model?: string;
  durationMs?: number;
};

export function getSessionPromptSelection(
  data: OpencodeSessionData | undefined,
): OpencodePromptSelection {
  if (!data) return {};

  if (data.session.model?.providerID && data.session.model.id) {
    return {
      model: `${data.session.model.providerID}/${data.session.model.id}`,
      variant: data.session.model.variant,
      agent: data.session.agent,
    };
  }

  for (let index = data.messages.length - 1; index >= 0; index -= 1) {
    const message = data.messages[index]?.info;
    if (!message) continue;

    if (message.role === "user" && message.model) {
      return {
        model: `${message.model.providerID}/${message.model.modelID}`,
        variant: message.model.variant,
        agent: message.agent || data.session.agent,
      };
    }

    if (message.role === "assistant") {
      return {
        model: `${message.providerID}/${message.modelID}`,
        variant: message.variant,
        agent: message.agent || data.session.agent,
      };
    }
  }

  return { agent: data.session.agent };
}

export function getMessageText(parts: SessionPart[]) {
  return parts
    .flatMap((part) =>
      part.type === "text" && !part.ignored && part.text.trim()
        ? [part.text]
        : [],
    )
    .join("\n\n");
}

export function getRevertedMessageLabel(parts: SessionPart[]) {
  const text = getMessageText(parts).trim();
  if (text) return text;

  const attachmentCount = parts.filter((part) => part.type === "file").length;
  if (attachmentCount === 1) return "[attachment]";
  if (attachmentCount > 1) return `[${attachmentCount} attachments]`;
  return "Empty message";
}

export function createChatTurns(
  messages: OpencodeSessionData["messages"],
  models: OpencodeModelOption[] = [],
) {
  const modelsById = new Map(
    models.map((model) => [
      `${model.providerID}/${model.modelID}`,
      model,
    ]),
  );
  const turns: ChatTurn[] = messages
    .filter((message) => message.info.role === "user")
    .map((message) => ({
      id: message.info.id,
      question: getMessageText(message.parts),
      images: message.parts.flatMap((part) =>
        part.type === "file" && part.mime.startsWith("image/")
          ? [
              {
                id: part.id,
                url: part.url,
                name: part.filename ?? "Attached image",
              },
            ]
          : [],
      ),
      summaryDiffs:
        typeof message.info.summary === "object" && message.info.summary
          ? message.info.summary.diffs
          : [],
      content: [],
      agent: undefined,
      provider: undefined,
      model: undefined,
      durationMs: undefined,
    }));
  const turnsByMessageId = new Map(turns.map((turn) => [turn.id, turn]));
  const latestTodoByTurnId = new Map<string, ToolPart>();

  for (const message of messages) {
    if (message.info.role !== "assistant") continue;

    const turn = turnsByMessageId.get(message.info.parentID);
    if (!turn) continue;

    for (const part of message.parts) {
      if (part.type === "reasoning" && !part.time?.end) {
        turn.content.push({ id: part.id, type: "thinking", active: true });
      }

      if (part.type === "text" && !part.ignored && part.text.trim()) {
        turn.content.push({ id: part.id, type: "text", text: part.text });
      }

      if (part.type === "tool") {
        if (part.tool === "todowrite") {
          latestTodoByTurnId.set(turn.id, part);
          continue;
        }

        if (
          part.tool === "question" &&
          (part.state.status === "pending" || part.state.status === "running")
        ) {
          continue;
        }

        const previousContent = turn.content.at(-1);
        if (
          (part.tool === "glob" || part.tool === "read") &&
          previousContent?.type === "tools" &&
          previousContent.tools.every(
            (tool) => tool.tool === "glob" || tool.tool === "read",
          )
        ) {
          previousContent.tools.push(part);
        } else if (
          isEditTool(part) &&
          previousContent?.type === "tools" &&
          previousContent.tools.every(isEditTool)
        ) {
          previousContent.tools.push(part);
        } else {
          turn.content.push({ id: part.id, type: "tools", tools: [part] });
        }
      }
    }

    if (message.info.error) {
      turn.content.push({
        id: `${message.info.id}-error`,
        type: "error",
        ...getChatError(message.info.error),
      });
    }

    const model = modelsById.get(
      `${message.info.providerID}/${message.info.modelID}`,
    );
    turn.agent = message.info.agent;
    turn.provider = model?.providerName ?? message.info.providerID;
    turn.model = model?.name ?? message.info.modelID;
    turn.durationMs = message.info.time.completed
      ? message.info.time.completed - message.info.time.created
      : undefined;
  }

  for (const turn of turns) {
    const latestTodo = latestTodoByTurnId.get(turn.id);
    if (latestTodo) {
      turn.content.push({
        id: `${latestTodo.id}:todo-tracker`,
        type: "tools",
        tools: [latestTodo],
      });
    }
  }

  return turns;
}

export function isEditTool(tool: ToolPart) {
  return ["edit", "write", "patch", "apply_patch"].includes(tool.tool);
}

function getChatError(error: { name: string; data: unknown }) {
  const data =
    error.data && typeof error.data === "object"
      ? (error.data as Record<string, unknown>)
      : {};
  return {
    title: getChatErrorTitle(error.name),
    message:
      typeof data.message === "string"
        ? data.message
        : "OpenCode could not complete this request.",
    statusCode:
      typeof data.statusCode === "number" ? data.statusCode : undefined,
  };
}

function getChatErrorTitle(name: string) {
  switch (name) {
    case "ProviderAuthError":
      return "Provider authentication failed";
    case "ContextOverflowError":
      return "Context limit exceeded";
    case "ContentFilterError":
      return "Response blocked";
    case "MessageOutputLengthError":
      return "Response was too long";
    case "MessageAbortedError":
      return "Request was stopped";
    case "StructuredOutputError":
      return "Invalid structured response";
    default:
      return "OpenCode request failed";
  }
}
