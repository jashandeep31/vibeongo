import { instances, projects, projectSessions } from "@repo/db";
import type {
  Message as OpencodeMessage,
  Part as OpencodePart,
  Session as OpencodeSession,
  SessionStatus as OpencodeSessionStatus,
} from "@opencode-ai/sdk/v2/client";
import { create } from "zustand";

interface ProjectsStore {
  projects: (typeof projects.$inferSelect)[];
  addProject: (project: typeof projects.$inferSelect) => void;
  addAllProjects: (projectList: (typeof projects.$inferSelect)[]) => void;
  updateProject: (
    projectId: (typeof projects.$inferSelect)["id"],
    updates: Partial<typeof projects.$inferSelect>,
  ) => void;
  deleteProject: (projectId: (typeof projects.$inferSelect)["id"]) => void;
}

export const useProjectsStore = create<ProjectsStore>((set) => ({
  projects: [],
  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, project],
    })),
  addAllProjects: (projectList) => set({ projects: projectList }),
  updateProject: (projectId, updates) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? { ...project, ...updates } : project,
      ),
    })),
  deleteProject: (projectId) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== projectId),
    })),
}));

type SessionState = "running" | "stopped" | "processing";
type InstanceSyncState = "pending" | "success" | "error";
type SessionEntry = {
  session: typeof projectSessions.$inferSelect;
  instance: typeof instances.$inferSelect | null;
  state: SessionState;
  instanceSyncState: InstanceSyncState;
};

interface SessionsStore {
  sessions: SessionEntry[];
  getAllSessions: () => SessionEntry[];
  getProjectSessions: (
    projectId: (typeof projectSessions.$inferSelect)["project_id"],
  ) => SessionEntry[];
  addSession: (session: SessionEntry) => void;
  addAllSessions: (sessions: SessionEntry[]) => void;
  updateSession: (
    sessionId: (typeof projectSessions.$inferSelect)["id"],
    updates: Partial<SessionEntry>,
  ) => void;
  updateSessionState: (
    sessionId: (typeof projectSessions.$inferSelect)["id"],
    state: SessionState,
  ) => void;
  deleteSession: (
    sessionId: (typeof projectSessions.$inferSelect)["id"],
  ) => void;
}

export const useSessionsStore = create<SessionsStore>((set, get) => ({
  sessions: [],
  getAllSessions: () => get().sessions,
  getProjectSessions: (projectId) =>
    get().sessions.filter((entry) => entry.session.project_id === projectId),
  addSession: (session) =>
    set((state) => ({
      sessions: [...state.sessions, session],
    })),
  addAllSessions: (sessions) => set({ sessions }),
  updateSession: (sessionId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((entry) =>
        entry.session.id === sessionId ? { ...entry, ...updates } : entry,
      ),
    })),
  updateSessionState: (sessionId, state) =>
    set((current) => ({
      sessions: current.sessions.map((entry) =>
        entry.session.id === sessionId ? { ...entry, state } : entry,
      ),
    })),
  deleteSession: (sessionId) =>
    set((current) => ({
      sessions: current.sessions.filter(
        (entry) => entry.session.id !== sessionId,
      ),
    })),
}));

export type OpencodeChatMessage = {
  info: OpencodeMessage;
  parts: OpencodePart[];
};

interface SessionChatsStore {
  attentionBySessionId: Record<string, Record<string, boolean>>;
  chatsBySessionId: Record<string, OpencodeSession[]>;
  messagesBySessionId: Record<string, Record<string, OpencodeChatMessage[]>>;
  statusesBySessionId: Record<string, Record<string, OpencodeSessionStatus>>;
  unreadBySessionId: Record<string, Record<string, boolean>>;
  getSessionChats: (projectSessionId: string) => OpencodeSession[];
  getChatMessages: (
    projectSessionId: string,
    chatId: string,
  ) => OpencodeChatMessage[];
  getChatStatus: (
    projectSessionId: string,
    chatId: string,
  ) => OpencodeSessionStatus;
  getChatUnread: (projectSessionId: string, chatId: string) => boolean;
  getChatAttention: (projectSessionId: string, chatId: string) => boolean;
  setSessionChats: (projectSessionId: string, chats: OpencodeSession[]) => void;
  upsertSessionChat: (projectSessionId: string, chat: OpencodeSession) => void;
  setChatMessages: (
    projectSessionId: string,
    chatId: string,
    messages: OpencodeChatMessage[],
  ) => void;
  upsertChatMessage: (
    projectSessionId: string,
    chatId: string,
    message: OpencodeChatMessage,
  ) => void;
  deleteChatMessage: (
    projectSessionId: string,
    chatId: string,
    messageId: string,
  ) => void;
  clearChatMessages: (projectSessionId: string, chatId: string) => void;
  setChatStatus: (
    projectSessionId: string,
    chatId: string,
    status: OpencodeSessionStatus,
  ) => void;
  setChatUnread: (
    projectSessionId: string,
    chatId: string,
    unread: boolean,
  ) => void;
  setChatAttention: (
    projectSessionId: string,
    chatId: string,
    attention: boolean,
  ) => void;
  deleteSessionChat: (projectSessionId: string, chatId: string) => void;
  clearSessionChats: (projectSessionId: string) => void;
}

export const useSessionChatsStore = create<SessionChatsStore>((set, get) => ({
  attentionBySessionId: {},
  chatsBySessionId: {},
  messagesBySessionId: {},
  statusesBySessionId: {},
  unreadBySessionId: {},
  getSessionChats: (projectSessionId) =>
    get().chatsBySessionId[projectSessionId] ?? [],
  getChatMessages: (projectSessionId, chatId) =>
    get().messagesBySessionId[projectSessionId]?.[chatId] ?? [],
  getChatStatus: (projectSessionId, chatId) =>
    get().statusesBySessionId[projectSessionId]?.[chatId] ?? { type: "idle" },
  getChatUnread: (projectSessionId, chatId) =>
    get().unreadBySessionId[projectSessionId]?.[chatId] ?? false,
  getChatAttention: (projectSessionId, chatId) =>
    get().attentionBySessionId[projectSessionId]?.[chatId] ?? false,
  setSessionChats: (projectSessionId, chats) =>
    set((state) => ({
      chatsBySessionId: {
        ...state.chatsBySessionId,
        [projectSessionId]: chats
          .filter((chat) => !chat.parentID)
          .sort((left, right) => right.time.created - left.time.created),
      },
    })),
  upsertSessionChat: (projectSessionId, chat) =>
    set((state) => {
      const sessionChats = state.chatsBySessionId[projectSessionId] ?? [];
      if (chat.parentID) {
        return {
          chatsBySessionId: {
            ...state.chatsBySessionId,
            [projectSessionId]: sessionChats.filter(
              (existingChat) => existingChat.id !== chat.id,
            ),
          },
        };
      }

      const existingChatIndex = sessionChats.findIndex(
        (existingChat) => existingChat.id === chat.id,
      );
      const nextSessionChats = [...sessionChats];

      if (existingChatIndex === -1) {
        nextSessionChats.push(chat);
      } else {
        nextSessionChats[existingChatIndex] = chat;
      }

      nextSessionChats.sort(
        (left, right) => right.time.created - left.time.created,
      );

      return {
        chatsBySessionId: {
          ...state.chatsBySessionId,
          [projectSessionId]: nextSessionChats,
        },
      };
    }),
  setChatMessages: (projectSessionId, chatId, messages) =>
    set((state) => ({
      messagesBySessionId: {
        ...state.messagesBySessionId,
        [projectSessionId]: {
          ...state.messagesBySessionId[projectSessionId],
          [chatId]: messages,
        },
      },
    })),
  upsertChatMessage: (projectSessionId, chatId, message) =>
    set((state) => {
      const chatMessages =
        state.messagesBySessionId[projectSessionId]?.[chatId] ?? [];
      const existingMessageIndex = chatMessages.findIndex(
        (existingMessage) => existingMessage.info.id === message.info.id,
      );
      const nextChatMessages = [...chatMessages];

      if (existingMessageIndex === -1) {
        nextChatMessages.push(message);
      } else {
        nextChatMessages[existingMessageIndex] = message;
      }

      return {
        messagesBySessionId: {
          ...state.messagesBySessionId,
          [projectSessionId]: {
            ...state.messagesBySessionId[projectSessionId],
            [chatId]: nextChatMessages,
          },
        },
      };
    }),
  deleteChatMessage: (projectSessionId, chatId, messageId) =>
    set((state) => ({
      messagesBySessionId: {
        ...state.messagesBySessionId,
        [projectSessionId]: {
          ...state.messagesBySessionId[projectSessionId],
          [chatId]: (
            state.messagesBySessionId[projectSessionId]?.[chatId] ?? []
          ).filter((message) => message.info.id !== messageId),
        },
      },
    })),
  clearChatMessages: (projectSessionId, chatId) =>
    set((state) => {
      const projectSessionMessages = {
        ...state.messagesBySessionId[projectSessionId],
      };
      Reflect.deleteProperty(projectSessionMessages, chatId);

      return {
        messagesBySessionId: {
          ...state.messagesBySessionId,
          [projectSessionId]: projectSessionMessages,
        },
      };
    }),
  setChatStatus: (projectSessionId, chatId, status) =>
    set((state) => ({
      statusesBySessionId: {
        ...state.statusesBySessionId,
        [projectSessionId]: {
          ...state.statusesBySessionId[projectSessionId],
          [chatId]: status,
        },
      },
    })),
  setChatUnread: (projectSessionId, chatId, unread) =>
    set((state) => ({
      unreadBySessionId: {
        ...state.unreadBySessionId,
        [projectSessionId]: {
          ...state.unreadBySessionId[projectSessionId],
          [chatId]: unread,
        },
      },
    })),
  setChatAttention: (projectSessionId, chatId, attention) =>
    set((state) => ({
      attentionBySessionId: {
        ...state.attentionBySessionId,
        [projectSessionId]: {
          ...state.attentionBySessionId[projectSessionId],
          [chatId]: attention,
        },
      },
    })),
  deleteSessionChat: (projectSessionId, chatId) =>
    set((state) => {
      const projectSessionMessages = {
        ...state.messagesBySessionId[projectSessionId],
      };
      const projectSessionStatuses = {
        ...state.statusesBySessionId[projectSessionId],
      };
      const projectSessionUnread = {
        ...state.unreadBySessionId[projectSessionId],
      };
      const projectSessionAttention = {
        ...state.attentionBySessionId[projectSessionId],
      };
      Reflect.deleteProperty(projectSessionMessages, chatId);
      Reflect.deleteProperty(projectSessionStatuses, chatId);
      Reflect.deleteProperty(projectSessionUnread, chatId);
      Reflect.deleteProperty(projectSessionAttention, chatId);

      return {
        chatsBySessionId: {
          ...state.chatsBySessionId,
          [projectSessionId]: (
            state.chatsBySessionId[projectSessionId] ?? []
          ).filter((chat) => chat.id !== chatId),
        },
        messagesBySessionId: {
          ...state.messagesBySessionId,
          [projectSessionId]: projectSessionMessages,
        },
        statusesBySessionId: {
          ...state.statusesBySessionId,
          [projectSessionId]: projectSessionStatuses,
        },
        unreadBySessionId: {
          ...state.unreadBySessionId,
          [projectSessionId]: projectSessionUnread,
        },
        attentionBySessionId: {
          ...state.attentionBySessionId,
          [projectSessionId]: projectSessionAttention,
        },
      };
    }),
  clearSessionChats: (projectSessionId) =>
    set((state) => {
      const remainingChats = { ...state.chatsBySessionId };
      const remainingMessages = { ...state.messagesBySessionId };
      const remainingStatuses = { ...state.statusesBySessionId };
      const remainingUnread = { ...state.unreadBySessionId };
      const remainingAttention = { ...state.attentionBySessionId };
      Reflect.deleteProperty(remainingChats, projectSessionId);
      Reflect.deleteProperty(remainingMessages, projectSessionId);
      Reflect.deleteProperty(remainingStatuses, projectSessionId);
      Reflect.deleteProperty(remainingUnread, projectSessionId);
      Reflect.deleteProperty(remainingAttention, projectSessionId);
      return {
        attentionBySessionId: remainingAttention,
        chatsBySessionId: remainingChats,
        messagesBySessionId: remainingMessages,
        statusesBySessionId: remainingStatuses,
        unreadBySessionId: remainingUnread,
      };
    }),
}));
