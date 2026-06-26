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
  setUnsetStreamingQuestions: (q: IChatQuestion | null) => void;

  setQuestions: (questions: IChatQuestion[]) => void;
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
  setUnsetStreamingQuestions: (q: IChatQuestion | null) =>
    set(() => ({
      streamingQuestion: q,
    })),

  setQuestions: (questions: IChatQuestion[]) =>
    set(() => ({
      chatQuestionsList: questions,
    })),

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
