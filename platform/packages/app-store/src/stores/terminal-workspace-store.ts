import { create } from "zustand";

export type TerminalWorkspaceStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type TerminalTmuxPane = { name: string };
export type TerminalTmuxWindow = {
  id: string;
  name: string;
  panes: TerminalTmuxPane[];
};
export type TerminalTmuxSession = {
  name: string;
  windows: TerminalTmuxWindow[];
};
export type TerminalFavoriteDir = { name: string; path: string };
export type TerminalSessionSummary =
  | {
      id: string;
      kind: "shell";
      name: string;
      workingDirectory: string;
      buffer?: string;
    }
  | {
      id: string;
      kind: "tmux";
      name: string;
      tmuxSessionName: string;
      tmuxWindowId: string;
      tmuxWindowName: string;
      buffer?: string;
    };

export type TerminalWorkspaceSnapshot = {
  activeTerminalSessionId: string | null;
  favoriteDirs: TerminalFavoriteDir[];
  status: TerminalWorkspaceStatus;
  terminalSessionIds: string[];
  terminalSessions: TerminalSessionSummary[];
  tmuxSessions: TerminalTmuxSession[];
  updatedAt: number | null;
};

interface TerminalWorkspaceStore {
  workspaces: Record<string, TerminalWorkspaceSnapshot>;
  removeWorkspace: (projectSessionId: string) => void;
  setWorkspace: (
    projectSessionId: string,
    workspace: Omit<TerminalWorkspaceSnapshot, "updatedAt">,
  ) => void;
}

export const EMPTY_TERMINAL_WORKSPACE: TerminalWorkspaceSnapshot = {
  activeTerminalSessionId: null,
  favoriteDirs: [],
  status: "disconnected",
  terminalSessionIds: [],
  terminalSessions: [],
  tmuxSessions: [],
  updatedAt: null,
};

export const useTerminalWorkspaceStore = create<TerminalWorkspaceStore>(
  (set) => ({
    workspaces: {},
    removeWorkspace: (projectSessionId) =>
      set((state) => {
        const { [projectSessionId]: _removed, ...workspaces } =
          state.workspaces;
        return { workspaces };
      }),
    setWorkspace: (projectSessionId, workspace) =>
      set((state) => ({
        workspaces: {
          ...state.workspaces,
          [projectSessionId]: { ...workspace, updatedAt: Date.now() },
        },
      })),
  }),
);
