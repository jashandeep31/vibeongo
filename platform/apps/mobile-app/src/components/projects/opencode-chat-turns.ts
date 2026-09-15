import {
  createOpencodeChatTurns,
  getOpencodeMessageText,
  getRevertedMessageLabel,
  getSessionPromptSelection,
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
  let cache = new Map<string, { messages: SessionMessage[]; turn: ChatTurn }>();
  let previousModels: OpencodeModelOption[] | undefined;
  let previousTurns: ChatTurn[] = [];
  return (messages: SessionMessage[], models?: OpencodeModelOption[]) => {
    if (models !== previousModels) cache.clear();
    previousModels = models;
    const groups = new Map<string, SessionMessage[]>();
    for (const message of messages) {
      if (message.info.role === "user") groups.set(message.info.id, [message]);
    }
    for (const message of messages) {
      if (message.info.role === "assistant")
        groups.get(message.info.parentID)?.push(message);
    }
    const next = new Map<
      string,
      { messages: SessionMessage[]; turn: ChatTurn }
    >();
    const turns: ChatTurn[] = [];
    for (const [id, sources] of groups) {
      const old = cache.get(id);
      const turn =
        old &&
        old.messages.length === sources.length &&
        sources.every((source, index) => source === old.messages[index])
          ? old.turn
          : createChatTurns(sources, models)[0]!;
      if (
        old &&
        turn !== old.turn &&
        sources.length === old.messages.length &&
        sources.every(
          (source, index) =>
            source.parts === old.messages[index]?.parts &&
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
      next.set(id, { messages: sources, turn });
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
