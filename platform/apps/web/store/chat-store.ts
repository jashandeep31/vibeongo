import { chatAnswer, chatQuestions } from "@repo/db";
import { create } from "zustand";

export type IChatQuestion = typeof chatQuestions.$inferSelect & {
  answer: typeof chatAnswer.$inferSelect | null;
};

export type ChatAnswerDelta = {
  chatId: string;
  questionId: string;
  answerId: string;
  answerDelta: string;
  reasoningDelta: string;
  memory?: string;
  steps?: (typeof chatAnswer.$inferSelect)["steps"];
  usage?: (typeof chatAnswer.$inferSelect)["usage"];
  finishReason?: string | null;
};

interface ChatStore {
  chatId: string;
  chatQuestionsList: IChatQuestion[];
  resetChat: () => void;
  updateChat: (chatId: string) => void;
  streamingQuestion: IChatQuestion | null;

  setQuestions: (questions: IChatQuestion[]) => void;
  setStreamingQuestion: (q: IChatQuestion) => void;
  appendStreamingAnswerDelta: (delta: ChatAnswerDelta) => void;
  clearStreamingQuestion: (questionId?: string) => void;
  upsertFinalQuestion: (q: IChatQuestion) => void;
  upsertQuestion: (q: IChatQuestion) => void;
  addQuestion: (q: IChatQuestion) => void;
}

export const chatStore = create<ChatStore>((set) => ({
  chatId: "",
  resetChat: () =>
    set(() => ({
      chatId: "",
      chatQuestionsList: [],
      streamingQuestion: null,
    })),
  updateChat: (chatId) => set(() => ({ chatId })),
  chatQuestionsList: [],

  streamingQuestion: null,

  setQuestions: (questions: IChatQuestion[]) =>
    set(() => ({
      chatQuestionsList: questions,
      streamingQuestion: null,
    })),

  setStreamingQuestion: (q: IChatQuestion) =>
    set((state) => {
      const existingQuestion = state.streamingQuestion;
      if (
        existingQuestion?.id === q.id &&
        existingQuestion?.answer?.answer === q.answer?.answer &&
        existingQuestion?.answer?.reasoning === q.answer?.reasoning &&
        existingQuestion?.answer?.id === q.answer?.id &&
        existingQuestion?.answer?.memory === q.answer?.memory
      ) {
        return state;
      }

      return { streamingQuestion: q };
    }),

  appendStreamingAnswerDelta: (delta: ChatAnswerDelta) =>
    set((state) => {
      const streamingQuestion = state.streamingQuestion;
      if (!streamingQuestion) return state;
      if (streamingQuestion.chat_id !== delta.chatId) return state;
      if (streamingQuestion.id !== delta.questionId) return state;
      if (!streamingQuestion.answer) return state;
      if (streamingQuestion.answer.id !== delta.answerId) return state;

      return {
        streamingQuestion: {
          ...streamingQuestion,
          answer: {
            ...streamingQuestion.answer,
            answer: streamingQuestion.answer.answer + delta.answerDelta,
            reasoning:
              (streamingQuestion.answer.reasoning ?? "") + delta.reasoningDelta,
            memory: delta.memory ?? streamingQuestion.answer.memory,
            steps: delta.steps ?? streamingQuestion.answer.steps,
            usage: delta.usage ?? streamingQuestion.answer.usage,
            finish_reason:
              delta.finishReason ?? streamingQuestion.answer.finish_reason,
          },
        },
      };
    }),

  clearStreamingQuestion: (questionId?: string) =>
    set((state) => {
      if (!state.streamingQuestion) return state;
      if (questionId && state.streamingQuestion.id !== questionId) return state;

      return { streamingQuestion: null };
    }),

  upsertFinalQuestion: (q: IChatQuestion) =>
    set((state) => {
      const existingQuestionIndex = state.chatQuestionsList.findIndex(
        (item) => item.id === q.id,
      );

      if (existingQuestionIndex === -1) {
        return {
          chatQuestionsList: [...state.chatQuestionsList, q],
          streamingQuestion:
            state.streamingQuestion?.id === q.id
              ? null
              : state.streamingQuestion,
        };
      }

      return {
        chatQuestionsList: state.chatQuestionsList.map((item, index) =>
          index === existingQuestionIndex ? q : item,
        ),
        streamingQuestion:
          state.streamingQuestion?.id === q.id ? null : state.streamingQuestion,
      };
    }),

  upsertQuestion: (q: IChatQuestion) =>
    set((state) => {
      const existingQuestionIndex = state.chatQuestionsList.findIndex(
        (item) => item.id === q.id,
      );

      if (existingQuestionIndex === -1) {
        return {
          chatQuestionsList: [...state.chatQuestionsList, q],
          streamingQuestion: q,
        };
      }

      return {
        chatQuestionsList: state.chatQuestionsList.map((item, index) =>
          index === existingQuestionIndex ? q : item,
        ),
        streamingQuestion: q,
      };
    }),

  addQuestion: (q: IChatQuestion) =>
    set((state) => ({
      chatQuestionsList: [...state.chatQuestionsList, q],
    })),
}));
