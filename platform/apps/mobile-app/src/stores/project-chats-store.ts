import { create } from "zustand";

import type {
  OpencodeChatOption,
  OpencodeSessionStatus,
} from "@/features/opencode/opencode-api";

export type ProjectChatsLoadState = "idle" | "loading" | "ready" | "error";

type ProjectChatsStore = {
  activeChatIdByProjectSessionId: Record<string, string | undefined>;
  chatsByProjectSessionId: Record<string, OpencodeChatOption[]>;
  errorByProjectSessionId: Record<string, string | undefined>;
  loadStateByProjectSessionId: Record<string, ProjectChatsLoadState>;
  statusByProjectSessionId: Record<
    string,
    Record<string, OpencodeSessionStatus>
  >;
  setActiveChat: (projectSessionId: string, chatId?: string) => void;
  setChatStatus: (
    projectSessionId: string,
    chatId: string,
    status: OpencodeSessionStatus,
  ) => void;
  setChats: (projectSessionId: string, chats: OpencodeChatOption[]) => void;
  setLoadState: (
    projectSessionId: string,
    state: ProjectChatsLoadState,
    error?: string,
  ) => void;
  upsertChat: (projectSessionId: string, chat: OpencodeChatOption) => void;
  removeChat: (projectSessionId: string, chatId: string) => void;
  clearProjectSession: (projectSessionId: string) => void;
};

export const EMPTY_PROJECT_CHATS: OpencodeChatOption[] = [];
export const EMPTY_PROJECT_CHAT_STATUSES: Record<
  string,
  OpencodeSessionStatus
> = {};

export const useProjectChatsStore = create<ProjectChatsStore>((set) => ({
  activeChatIdByProjectSessionId: {},
  chatsByProjectSessionId: {},
  errorByProjectSessionId: {},
  loadStateByProjectSessionId: {},
  statusByProjectSessionId: {},
  setActiveChat: (projectSessionId, chatId) =>
    set((state) => ({
      activeChatIdByProjectSessionId: {
        ...state.activeChatIdByProjectSessionId,
        [projectSessionId]: chatId,
      },
    })),
  setChatStatus: (projectSessionId, chatId, status) =>
    set((state) => ({
      statusByProjectSessionId: {
        ...state.statusByProjectSessionId,
        [projectSessionId]: {
          ...state.statusByProjectSessionId[projectSessionId],
          [chatId]: status,
        },
      },
    })),
  setChats: (projectSessionId, chats) =>
    set((state) => ({
      chatsByProjectSessionId: {
        ...state.chatsByProjectSessionId,
        [projectSessionId]: chats,
      },
      errorByProjectSessionId: {
        ...state.errorByProjectSessionId,
        [projectSessionId]: undefined,
      },
      loadStateByProjectSessionId: {
        ...state.loadStateByProjectSessionId,
        [projectSessionId]: "ready",
      },
    })),
  setLoadState: (projectSessionId, loadState, error) =>
    set((state) => ({
      errorByProjectSessionId: {
        ...state.errorByProjectSessionId,
        [projectSessionId]: error,
      },
      loadStateByProjectSessionId: {
        ...state.loadStateByProjectSessionId,
        [projectSessionId]: loadState,
      },
    })),
  upsertChat: (projectSessionId, chat) =>
    set((state) => {
      const current = state.chatsByProjectSessionId[projectSessionId] ?? [];
      return {
        chatsByProjectSessionId: {
          ...state.chatsByProjectSessionId,
          [projectSessionId]: [
            chat,
            ...current.filter((item) => item.id !== chat.id),
          ],
        },
      };
    }),
  removeChat: (projectSessionId, chatId) =>
    set((state) => ({
      chatsByProjectSessionId: {
        ...state.chatsByProjectSessionId,
        [projectSessionId]: (
          state.chatsByProjectSessionId[projectSessionId] ?? []
        ).filter((chat) => chat.id !== chatId),
      },
    })),
  clearProjectSession: (projectSessionId) =>
    set((state) => {
      const active = { ...state.activeChatIdByProjectSessionId };
      const chats = { ...state.chatsByProjectSessionId };
      const errors = { ...state.errorByProjectSessionId };
      const loadStates = { ...state.loadStateByProjectSessionId };
      const statuses = { ...state.statusByProjectSessionId };
      Reflect.deleteProperty(active, projectSessionId);
      Reflect.deleteProperty(chats, projectSessionId);
      Reflect.deleteProperty(errors, projectSessionId);
      Reflect.deleteProperty(loadStates, projectSessionId);
      Reflect.deleteProperty(statuses, projectSessionId);
      return {
        activeChatIdByProjectSessionId: active,
        chatsByProjectSessionId: chats,
        errorByProjectSessionId: errors,
        loadStateByProjectSessionId: loadStates,
        statusByProjectSessionId: statuses,
      };
    }),
}));
