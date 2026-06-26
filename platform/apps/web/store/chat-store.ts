import { chatAnswer, chatQuestions } from "@repo/db";
import { create } from "zustand";

type IChatQuestion = typeof chatQuestions.$inferSelect & {
  answer: typeof chatAnswer.$inferSelect | null;
};
interface ChatStore {
  chatId: string;
  chatQuestionsList: IChatQuestion[];
  resetChat: () => void;
  updateChat: () => void;
  streamingQuestion: IChatQuestion | null;
  setUnsetStreamingQuestions: (q: IChatQuestion | null) => void;

  addQuestion: (q: IChatQuestion) => void;
}

export const chatStore = create<ChatStore>((set) => ({
  chatId: "",
  resetChat: () => set(() => ({ chatId: "" })),
  updateChat: () => set(() => ({ chatId: "" })),
  chatQuestionsList: [],
  streamingQuestion: null,
  setUnsetStreamingQuestions: (q: IChatQuestion | null) =>
    set(() => ({
      streamingQuestion: q,
    })),

  addQuestion: (q: IChatQuestion) =>
    set((state) => ({
      chatQuestionsList: [...state.chatQuestionsList, q],
    })),
}));
