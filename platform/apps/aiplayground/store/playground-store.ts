import { instances, projects, projectSessions } from "@repo/db";
import type { Session as OpencodeSession } from "@opencode-ai/sdk/v2/client";
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
type SessionEntry = {
  session: typeof projectSessions.$inferSelect;
  instance: typeof instances.$inferSelect | null;
  state: SessionState;
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

interface SessionChatsStore {
  chatsBySessionId: Record<string, OpencodeSession[]>;
  getSessionChats: (projectSessionId: string) => OpencodeSession[];
  setSessionChats: (
    projectSessionId: string,
    chats: OpencodeSession[],
  ) => void;
  upsertSessionChat: (
    projectSessionId: string,
    chat: OpencodeSession,
  ) => void;
  deleteSessionChat: (projectSessionId: string, chatId: string) => void;
  clearSessionChats: (projectSessionId: string) => void;
}

export const useSessionChatsStore = create<SessionChatsStore>((set, get) => ({
  chatsBySessionId: {},
  getSessionChats: (projectSessionId) =>
    get().chatsBySessionId[projectSessionId] ?? [],
  setSessionChats: (projectSessionId, chats) =>
    set((state) => ({
      chatsBySessionId: {
        ...state.chatsBySessionId,
        [projectSessionId]: chats,
      },
    })),
  upsertSessionChat: (projectSessionId, chat) =>
    set((state) => {
      const sessionChats = state.chatsBySessionId[projectSessionId] ?? [];
      const existingChatIndex = sessionChats.findIndex(
        (existingChat) => existingChat.id === chat.id,
      );
      const nextSessionChats = [...sessionChats];

      if (existingChatIndex === -1) {
        nextSessionChats.push(chat);
      } else {
        nextSessionChats[existingChatIndex] = chat;
      }

      return {
        chatsBySessionId: {
          ...state.chatsBySessionId,
          [projectSessionId]: nextSessionChats,
        },
      };
    }),
  deleteSessionChat: (projectSessionId, chatId) =>
    set((state) => ({
      chatsBySessionId: {
        ...state.chatsBySessionId,
        [projectSessionId]: (
          state.chatsBySessionId[projectSessionId] ?? []
        ).filter((chat) => chat.id !== chatId),
      },
    })),
  clearSessionChats: (projectSessionId) =>
    set((state) => {
      const remainingChats = { ...state.chatsBySessionId };
      Reflect.deleteProperty(remainingChats, projectSessionId);
      return { chatsBySessionId: remainingChats };
    }),
}));
