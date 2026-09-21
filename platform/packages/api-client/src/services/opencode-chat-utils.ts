import type { ToolPart } from "./opencode-types.js";
import { normalizeOpencodeError } from "./opencode-errors.js";

import { getOpencodeUserMessage } from "./opencode-services.js";
import type {
  OpencodeModelOption,
  OpencodePromptSelection,
  OpencodeSessionData,
} from "./opencode-services.js";

export const OPENCODE_MESSAGE_PAGE_SIZE = 26;

export type SessionMessage = OpencodeSessionData["messages"][number];
export type SessionPart = SessionMessage["parts"][number];
export type OpencodeToolPart = Extract<SessionPart, { type: "tool" }>;
export type SnapshotFileDiff = OpencodeSessionData["changes"][number];

export type OpencodeToolRenderGroup = {
  kind: "files" | "skills" | "tool";
  tools: OpencodeToolPart[];
};

export function groupOpencodeToolsForRendering(
  tools: OpencodeToolPart[],
): OpencodeToolRenderGroup[] {
  return tools.reduce<OpencodeToolRenderGroup[]>((groups, tool) => {
    const fileTool = isFileChangeTool(tool);
    const skillTool = tool.tool === "skill" && tool.state.status !== "error";
    const previous = groups.at(-1);
    if (fileTool && previous?.kind === "files") {
      previous.tools.push(tool);
      return groups;
    }
    if (skillTool && previous?.kind === "skills") {
      previous.tools.push(tool);
      return groups;
    }
    groups.push({
      kind: fileTool ? "files" : skillTool ? "skills" : "tool",
      tools: [tool],
    });
    return groups;
  }, []);
}

export function deriveOpencodeToolFileDiff(
  tool: OpencodeToolPart,
): SnapshotFileDiff | undefined {
  const path = getToolInputString(tool, [
    "path",
    "filePath",
    "file_path",
    "filepath",
    "file",
  ]);
  if (!path) return undefined;

  if (tool.tool === "write") {
    const content = getToolInputString(tool, ["content"]);
    if (!content) return undefined;
    return createOpencodeFileDiff(path, "", content);
  }

  if (tool.tool === "edit") {
    const before = getToolInputString(tool, ["oldString", "old_string"]);
    const after = getToolInputString(tool, ["newString", "new_string"]);
    if (before === undefined || after === undefined || before === after) {
      return undefined;
    }
    return createOpencodeFileDiff(path, before, after);
  }

  return undefined;
}

function createOpencodeFileDiff(
  file: string,
  before: string,
  after: string,
): SnapshotFileDiff {
  const beforeLines = splitDiffLines(before);
  const afterLines = splitDiffLines(after);
  let prefix = 0;
  while (
    prefix < beforeLines.length &&
    prefix < afterLines.length &&
    beforeLines[prefix] === afterLines[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < beforeLines.length - prefix &&
    suffix < afterLines.length - prefix &&
    beforeLines[beforeLines.length - 1 - suffix] ===
      afterLines[afterLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const removed = beforeLines.slice(prefix, beforeLines.length - suffix);
  const added = afterLines.slice(prefix, afterLines.length - suffix);
  const patch = [
    `--- ${file}`,
    `+++ ${file}`,
    `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`,
    ...beforeLines.slice(0, prefix).map((line) => ` ${line}`),
    ...removed.map((line) => `-${line}`),
    ...added.map((line) => `+${line}`),
    ...beforeLines.slice(beforeLines.length - suffix).map((line) => ` ${line}`),
  ].join("\n");

  return {
    file,
    patch,
    additions: added.length,
    deletions: removed.length,
  };
}

function splitDiffLines(value: string) {
  if (!value) return [];
  const lines = value.replaceAll("\r\n", "\n").split("\n");
  if (value.endsWith("\n")) lines.pop();
  return lines;
}

function getToolInputString(
  tool: OpencodeToolPart,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = tool.state.input[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

export type OpencodeChatContent =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "notice"; text: string }
  | { id: string; type: "tools"; tools: OpencodeToolPart[] }
  | { id: string; type: "thinking"; active: boolean }
  | {
      id: string;
      type: "retry";
      attempt: number;
      message: string;
      at: number;
    }
  | {
      id: string;
      type: "error";
      title: string;
      message: string;
      statusCode?: number;
    };

export type OpencodeChatTurn = {
  id: string;
  question: string;
  files: Array<{ id: string; path: string }>;
  images: Array<{ id: string; url: string; name: string }>;
  summaryDiffs: SnapshotFileDiff[];
  content: OpencodeChatContent[];
  agent: string | undefined;
  provider: string | undefined;
  model: string | undefined;
  durationMs: number | undefined;
};

export function groupConsecutiveOpencodeToolContent(
  content: OpencodeChatContent[],
) {
  let changed = false;
  const grouped: OpencodeChatContent[] = [];

  for (const block of content) {
    const previous = grouped.at(-1);
    if (
      isGroupableToolContent(block) &&
      previous?.type === "tools" &&
      isGroupableToolContent(previous)
    ) {
      grouped[grouped.length - 1] = {
        ...previous,
        tools: [...previous.tools, ...block.tools],
      };
      changed = true;
      continue;
    }
    grouped.push(block);
  }

  return changed ? grouped : content;
}

function isGroupableToolContent(
  content: OpencodeChatContent,
): content is Extract<OpencodeChatContent, { type: "tools" }> {
  return (
    content.type === "tools" &&
    content.tools.every(
      (tool) => tool.tool !== "question" && tool.tool !== "todowrite",
    )
  );
}

export function getSessionPromptSelection(
  data: OpencodeSessionData | undefined,
): OpencodePromptSelection {
  if (!data) return {};

  if (data.session.model?.providerID && data.session.model.id) {
    return {
      model: `${data.session.model.providerID}/${data.session.model.id}`,
      ...(data.session.model.variant
        ? { variant: data.session.model.variant }
        : {}),
      ...(data.session.agent ? { agent: data.session.agent } : {}),
    };
  }

  for (let index = data.messages.length - 1; index >= 0; index -= 1) {
    const message = data.messages[index]?.info;
    if (!message) continue;

    if (message.role === "user" && message.model) {
      return {
        model: `${message.model.providerID}/${message.model.modelID}`,
        ...(message.model.variant ? { variant: message.model.variant } : {}),
        ...(message.agent || data.session.agent
          ? { agent: message.agent || data.session.agent }
          : {}),
      };
    }

    if (message.role === "assistant") {
      return {
        model: `${message.providerID}/${message.modelID}`,
        ...(message.variant ? { variant: message.variant } : {}),
        ...(message.agent || data.session.agent
          ? { agent: message.agent || data.session.agent }
          : {}),
      };
    }
  }

  return data.session.agent ? { agent: data.session.agent } : {};
}

export function getOpencodeMessageText(parts: SessionPart[]) {
  return parts
    .flatMap((part) =>
      part.type === "text" &&
      !part.ignored &&
      !part.synthetic &&
      part.text.trim()
        ? [part.text]
        : [],
    )
    .join("\n\n");
}

export function getRevertedMessageLabel(parts: SessionPart[]) {
  const text = getOpencodeMessageText(parts).trim();
  if (text) return text;

  const attachmentCount = parts.filter((part) => part.type === "file").length;
  if (attachmentCount === 1) return "[attachment]";
  if (attachmentCount > 1) return `[${attachmentCount} attachments]`;
  return "Empty message";
}

export function createOpencodeChatTurns(
  messages: OpencodeSessionData["messages"],
  models: OpencodeModelOption[] = [],
) {
  const modelsById = new Map(
    models.map((model) => [`${model.providerID}/${model.modelID}`, model]),
  );
  const turns: OpencodeChatTurn[] = messages
    .filter((message) => message.info.role === "user")
    .map((message) => ({
      id: message.info.id,
      question: getOpencodeUserMessage(message.parts).text,
      files: getOpencodeUserMessage(message.parts).files,
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
  const seenPartIdsByTurnId = new Map<string, Set<string>>();
  const seenTextByTurnId = new Map<string, Set<string>>();

  for (const message of messages) {
    if (message.info.role !== "assistant") continue;

    const turn = turnsByMessageId.get(message.info.parentID);
    if (!turn) continue;
    const seenPartIds = seenPartIdsByTurnId.get(turn.id) ?? new Set<string>();
    seenPartIdsByTurnId.set(turn.id, seenPartIds);
    const seenText = seenTextByTurnId.get(turn.id) ?? new Set<string>();
    seenTextByTurnId.set(turn.id, seenText);

    for (const part of message.parts) {
      if (seenPartIds.has(part.id)) continue;
      seenPartIds.add(part.id);

      if (part.type === "reasoning" && !part.time?.end) {
        turn.content.push({ id: part.id, type: "thinking", active: true });
      }

      if (part.type === "text" && !part.ignored && part.text.trim()) {
        const normalizedText = part.text.trim();
        if (seenText.has(normalizedText)) continue;
        seenText.add(normalizedText);
        turn.content.push(
          part.display === "notice"
            ? { id: part.id, type: "notice", text: part.text }
            : { id: part.id, type: "text", text: part.text },
        );
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
          isFileChangeTool(part) &&
          previousContent?.type === "tools" &&
          previousContent.tools.every(isFileChangeTool)
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
        ...normalizeOpencodeError(message.info.error),
      });
    }

    if (message.info.retry) {
      turn.content.push({
        id: `${message.info.id}-retry-${message.info.retry.attempt}`,
        type: "retry",
        attempt: message.info.retry.attempt,
        message: message.info.retry.error.message,
        at: message.info.retry.at,
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

function isFileChangeTool(tool: OpencodeToolPart) {
  return ["edit", "write", "patch", "apply_patch"].includes(tool.tool);
}
