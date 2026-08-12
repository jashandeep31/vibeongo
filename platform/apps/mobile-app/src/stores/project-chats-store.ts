import { create } from "zustand";

import type {
  OpencodeChatState,
  OpencodeChatOption,
  OpencodeSessionStatus,
} from "@/features/opencode/opencode-api";

export type ProjectChatsLoadState = "idle" | "loading" | "ready" | "error";

export type CachedOpencodeChatState = OpencodeChatState & {
  error?: string;
  syncedAt: number;
  syncState: "idle" | "syncing" | "error";
};

type ProjectChatsStore = {
  activeChatIdByProjectSessionId: Record<string, string | undefined>;
  chatsByProjectSessionId: Record<string, OpencodeChatOption[]>;
  chatStateByProjectSessionId: Record<
    string,
    Record<string, CachedOpencodeChatState>
  >;
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
  setChatState: (
    projectSessionId: string,
    chatId: string,
    chatState: OpencodeChatState,
  ) => void;
  patchChatState: (
    projectSessionId: string,
    chatId: string,
    patch: Partial<OpencodeChatState>,
  ) => void;
  setChatSyncState: (
    projectSessionId: string,
    chatId: string,
    syncState: CachedOpencodeChatState["syncState"],
    error?: string,
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
  chatStateByProjectSessionId: {},
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
    set((state) => {
      const cached =
        state.chatStateByProjectSessionId[projectSessionId]?.[chatId];
      return {
        chatStateByProjectSessionId: cached
          ? {
              ...state.chatStateByProjectSessionId,
              [projectSessionId]: {
                ...state.chatStateByProjectSessionId[projectSessionId],
                [chatId]: { ...cached, status },
              },
            }
          : state.chatStateByProjectSessionId,
        statusByProjectSessionId: {
          ...state.statusByProjectSessionId,
          [projectSessionId]: {
            ...state.statusByProjectSessionId[projectSessionId],
            [chatId]: status,
          },
        },
      };
    }),
  setChatState: (projectSessionId, chatId, chatState) =>
    set((state) => ({
      chatStateByProjectSessionId: {
        ...state.chatStateByProjectSessionId,
        [projectSessionId]: {
          ...state.chatStateByProjectSessionId[projectSessionId],
          [chatId]: {
            ...chatState,
            error: undefined,
            syncedAt: Date.now(),
            syncState: "idle",
          },
        },
      },
      statusByProjectSessionId: {
        ...state.statusByProjectSessionId,
        [projectSessionId]: {
          ...state.statusByProjectSessionId[projectSessionId],
          [chatId]: chatState.status,
        },
      },
    })),
  patchChatState: (projectSessionId, chatId, patch) =>
    set((state) => {
      const cached =
        state.chatStateByProjectSessionId[projectSessionId]?.[chatId];
      if (!cached) return state;
      const next = { ...cached, ...patch };
      return {
        chatStateByProjectSessionId: {
          ...state.chatStateByProjectSessionId,
          [projectSessionId]: {
            ...state.chatStateByProjectSessionId[projectSessionId],
            [chatId]: next,
          },
        },
        statusByProjectSessionId: patch.status
          ? {
              ...state.statusByProjectSessionId,
              [projectSessionId]: {
                ...state.statusByProjectSessionId[projectSessionId],
                [chatId]: patch.status,
              },
            }
          : state.statusByProjectSessionId,
      };
    }),
  setChatSyncState: (projectSessionId, chatId, syncState, error) =>
    set((state) => {
      const cached =
        state.chatStateByProjectSessionId[projectSessionId]?.[chatId];
      if (!cached) return state;
      return {
        chatStateByProjectSessionId: {
          ...state.chatStateByProjectSessionId,
          [projectSessionId]: {
            ...state.chatStateByProjectSessionId[projectSessionId],
            [chatId]: { ...cached, error, syncState },
          },
        },
      };
    }),
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
      const chatStates = { ...state.chatStateByProjectSessionId };
      const errors = { ...state.errorByProjectSessionId };
      const loadStates = { ...state.loadStateByProjectSessionId };
      const statuses = { ...state.statusByProjectSessionId };
      Reflect.deleteProperty(active, projectSessionId);
      Reflect.deleteProperty(chats, projectSessionId);
      Reflect.deleteProperty(chatStates, projectSessionId);
      Reflect.deleteProperty(errors, projectSessionId);
      Reflect.deleteProperty(loadStates, projectSessionId);
      Reflect.deleteProperty(statuses, projectSessionId);
      return {
        activeChatIdByProjectSessionId: active,
        chatsByProjectSessionId: chats,
        chatStateByProjectSessionId: chatStates,
        errorByProjectSessionId: errors,
        loadStateByProjectSessionId: loadStates,
        statusByProjectSessionId: statuses,
      };
    }),
}));
