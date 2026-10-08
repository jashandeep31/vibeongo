import {
  createOpencodeChatTurns,
  getOpencodeMessageText,
  getRevertedMessageLabel,
  getSessionPromptSelection,
  groupConsecutiveOpencodeToolContent,
  type OpencodeChatContent,
  type OpencodeChatTurn,
  type OpencodeModelOption,
  type OpencodeToolPart,
  type SessionMessage,
  type SnapshotFileDiff,
} from "@repo/api-client";

export {
  getRevertedMessageLabel,
  getSessionPromptSelection,
  type SnapshotFileDiff,
};
export type ChatContent = OpencodeChatContent;
export type ChatTurn = OpencodeChatTurn;
export type ToolPart = OpencodeToolPart;
export const createChatTurns = createOpencodeChatTurns;
export const getMessageText = getOpencodeMessageText;
export const groupConsecutiveToolContent = groupConsecutiveOpencodeToolContent;

// Owned by the screen; retain only the three most recently displayed chats.
export function createChatTurnCache() {
  const selectors = new Map<
    string,
    ReturnType<typeof createChatTurnSelector>
  >();
  return (key: string) => {
    const selector = selectors.get(key) ?? createChatTurnSelector();
    selectors.delete(key);
    selectors.set(key, selector);
    if (selectors.size > 3) selectors.delete(selectors.keys().next().value!);
    return selector;
  };
}

export function createChatTimelineSelector() {
  let previousCompleted: ChatTurn[] = [];

  return (turns: ChatTurn[], isStreaming: boolean) => {
    const activeTurn = isStreaming ? turns.at(-1) : undefined;
    const completed = activeTurn ? turns.slice(0, -1) : turns;
    const completedTurns =
      completed.length === previousCompleted.length &&
      completed.every((turn, index) => turn === previousCompleted[index])
        ? previousCompleted
        : completed;

    previousCompleted = completedTurns;
    return { activeTurn, completedTurns };
  };
}

// Cache by immutable source messages, so a token only rebuilds its own turn.
export function createChatTurnSelector() {
  let cache = new Map<
    string,
    { messages: SessionMessage[]; turn: ChatTurn; isStreaming: boolean }
  >();
  let previousModels: OpencodeModelOption[] | undefined;
  let previousTurns: ChatTurn[] = [];
  return (
    messages: SessionMessage[],
    models?: OpencodeModelOption[],
    options: {
      isStreaming?: boolean;
      pendingInputIds?: ReadonlySet<string>;
    } = {},
  ) => {
    if (models !== previousModels) cache.clear();
    previousModels = models;
    const groups = new Map<string, SessionMessage[]>();
    let currentId: string | undefined;
    for (const message of messages) {
      if (message.info.role === "user") {
        currentId = message.info.id;
        const existing = groups.get(message.info.id) ?? [];
        groups.set(message.info.id, [message, ...existing]);
        continue;
      }
      const shellBoundary =
        message.info.mode === "system" &&
        message.info.parentID === `timeline:${message.info.id}`;
      // Transcript order owns the question/answer boundary. Assistant parent IDs
      // can still point at an optimistic question or an earlier model step.
      const id =
        (!shellBoundary && currentId) ||
        message.info.parentID ||
        `timeline:${message.info.id}`;
      currentId = id;
      const group = groups.get(id);
      if (group) group.push(message);
      else groups.set(id, [message]);
    }
    const next = new Map<
      string,
      { messages: SessionMessage[]; turn: ChatTurn; isStreaming: boolean }
    >();
    const activeId = [...groups.keys()].findLast(
      (id) => !options.pendingInputIds?.has(id),
    );
    const turns: ChatTurn[] = [];
    for (const [id, sources] of groups) {
      const old = cache.get(id);
      const isStreaming = Boolean(options.isStreaming && id === activeId);
      const turn =
        old &&
        old.isStreaming === isStreaming &&
        old.messages.length === sources.length &&
        sources.every((source, index) => source === old.messages[index])
          ? old.turn
          : createChatTurns(sources, models, { isStreaming })[0]!;
      if (
        old &&
        turn !== old.turn &&
        sources.length === old.messages.length &&
        sources.every(
          (source, index) =>
            source.parts === old.messages[index]?.parts &&
            (source.info.role !== "user" ||
              source.info === old.messages[index]?.info) &&
            (source.info.role !== "assistant" ||
              old.messages[index]?.info.role !== "assistant" ||
              source.info.error === old.messages[index]?.info.error),
        )
      ) {
        // Completion updates assistant metadata (model, provider, duration)
        // without changing its rendered parts. Preserve the expensive content
        // tree so only the footer needs to update.
        turn.content = old.turn.content;
        turn.files = old.turn.files;
        turn.images = old.turn.images;
        turn.question = old.turn.question;
        turn.summaryDiffs = old.turn.summaryDiffs;
      }
      next.set(id, { messages: sources, turn, isStreaming });
      turns.push(turn);
    }
    cache = next;
    if (
      turns.length === previousTurns.length &&
      turns.every((turn, index) => turn === previousTurns[index])
    ) {
      return previousTurns;
    }
    previousTurns = turns;
    return previousTurns;
  };
}

export function isEditTool(tool: ToolPart) {
  return ["edit", "write", "patch", "apply_patch"].includes(tool.tool);
}
