import type { chatAnswer, chatQuestions, chats } from "@repo/db";
import { create } from "zustand";

export type Chat = typeof chats.$inferSelect;
export type ChatQuestion = typeof chatQuestions.$inferSelect;
export type ChatAnswer = typeof chatAnswer.$inferSelect;
export type ChatTurn = ChatQuestion & { answer: ChatAnswer | null };
export type PersistedChatTurn = ChatQuestion & {
  chatAnswer: ChatAnswer | null;
};

export type ChatAnswerDelta = {
  chatId: string;
  questionId: string;
  answerId: string;
  answerDelta: string;
  reasoningDelta: string;
  memory?: string;
  steps?: ChatAnswer["steps"];
  usage?: ChatAnswer["usage"];
  finishReason?: string | null;
};

type ChatState = {
  chatId: string;
  chat: Chat | null;
  turns: ChatTurn[];
  streamingTurn: ChatTurn | null;
  isLoading: boolean;
  isNotFound: boolean;
  loadError: string | null;
  isSending: boolean;
  reset: (chatId: string) => void;
  load: (chat: Chat, turns: PersistedChatTurn[]) => void;
  markNotFound: () => void;
  markLoadError: (message: string) => void;
  setSending: (isSending: boolean) => void;
  startStreaming: (turn: ChatTurn) => void;
  appendAnswerDelta: (delta: ChatAnswerDelta) => void;
  finishTurn: (turn: ChatTurn) => void;
  clearStreaming: () => void;
};

function upsertTurn(turns: ChatTurn[], nextTurn: ChatTurn) {
  const existingIndex = turns.findIndex((turn) => turn.id === nextTurn.id);
  const nextTurns =
    existingIndex === -1
      ? [...turns, nextTurn]
      : turns.map((turn, index) => (index === existingIndex ? nextTurn : turn));

  return nextTurns.sort(
    (left, right) => left.order_number - right.order_number,
  );
}

export const useChatStore = create<ChatState>((set) => ({
  chatId: "",
  chat: null,
  turns: [],
  streamingTurn: null,
  isLoading: true,
  isNotFound: false,
  loadError: null,
  isSending: false,

  reset: (chatId) =>
    set({
      chatId,
      chat: null,
      turns: [],
      streamingTurn: null,
      isLoading: true,
      isNotFound: false,
      loadError: null,
      isSending: false,
    }),

  load: (chat, persistedTurns) =>
    set((state) => {
      if (state.chatId && state.chatId !== chat.id) return state;

      return {
        chatId: chat.id,
        chat,
        turns: persistedTurns.map(({ chatAnswer, ...question }) => ({
          ...question,
          answer: chatAnswer,
        })),
        streamingTurn: null,
        isLoading: false,
        isNotFound: false,
        loadError: null,
        isSending: false,
      };
    }),

  markNotFound: () =>
    set({
      chat: null,
      isLoading: false,
      isNotFound: true,
      loadError: null,
      isSending: false,
      streamingTurn: null,
    }),

  markLoadError: (message) =>
    set({
      chat: null,
      isLoading: false,
      isNotFound: false,
      loadError: message,
      isSending: false,
      streamingTurn: null,
    }),

  setSending: (isSending) => set({ isSending }),

  startStreaming: (turn) =>
    set((state) => {
      if (state.chatId && turn.chat_id !== state.chatId) return state;
      return { streamingTurn: turn, isSending: false };
    }),

  appendAnswerDelta: (delta) =>
    set((state) => {
      if (state.chatId && delta.chatId !== state.chatId) return state;

      const current = state.streamingTurn;
      if (
        !current?.answer ||
        current.id !== delta.questionId ||
        current.answer.id !== delta.answerId
      ) {
        return state;
      }

      return {
        streamingTurn: {
          ...current,
          answer: {
            ...current.answer,
            answer: current.answer.answer + delta.answerDelta,
            reasoning: (current.answer.reasoning ?? "") + delta.reasoningDelta,
            memory: delta.memory ?? current.answer.memory,
            steps: delta.steps ?? current.answer.steps,
            usage: delta.usage ?? current.answer.usage,
            finish_reason: delta.finishReason ?? current.answer.finish_reason,
          },
        },
      };
    }),

  finishTurn: (turn) =>
    set((state) => {
      if (state.chatId && turn.chat_id !== state.chatId) return state;

      return {
        turns: upsertTurn(state.turns, turn),
        streamingTurn:
          state.streamingTurn?.id === turn.id ? null : state.streamingTurn,
        isSending: false,
      };
    }),

  clearStreaming: () => set({ streamingTurn: null, isSending: false }),
}));
