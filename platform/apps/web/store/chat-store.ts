import { chatAnswer, chatQuestions } from "@repo/db";
import { create } from "zustand";

export type IChatQuestion = typeof chatQuestions.$inferSelect & {
  answer: typeof chatAnswer.$inferSelect | null;
};
interface ChatStore {
  chatId: string;
  chatQuestionsList: IChatQuestion[];
  resetChat: () => void;
  updateChat: (chatId: string) => void;
  streamingQuestion: IChatQuestion | null;

  setQuestions: (questions: IChatQuestion[]) => void;
  setStreamingQuestion: (q: IChatQuestion) => void;
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
