"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createWebTerminalSocket,
  requestWebTerminalSocketTokens,
} from "@/lib/web-terminal-socket";

export type WebTerminalSocketStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type WebTmuxPane = { name: string };
export type WebTmuxWindow = { id: string; name: string; panes: WebTmuxPane[] };
export type WebTmuxSession = { name: string; windows: WebTmuxWindow[] };
export type WebFavoriteDir = { name: string; path: string };
export type RuntimeStats = {
  cpu_percent: number;
  free: number;
  time: string;
  total: number;
  used: number;
  used_percent: number;
};
export type RuntimeControlMessage = {
  data?: unknown;
  type?: unknown;
};
export type WebTerminalSession =
  | { id: string; kind: "shell"; name: string; workingDirectory: string }
  | {
      id: string;
      kind: "tmux";
      name: string;
      tmuxSessionName: string;
      tmuxWindowId: string;
      tmuxWindowName: string;
    };

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

function parseTmuxSessions(value: unknown): WebTmuxSession[] | null {
  if (!Array.isArray(value)) return null;

  const sessions: WebTmuxSession[] = [];
  for (const sessionValue of value) {
    if (!sessionValue || typeof sessionValue !== "object") return null;
    const session = sessionValue as Record<string, unknown>;
    if (typeof session.name !== "string" || !Array.isArray(session.windows)) {
      return null;
    }

    const windows: WebTmuxWindow[] = [];
    for (const windowValue of session.windows) {
      if (!windowValue || typeof windowValue !== "object") return null;
      const window = windowValue as Record<string, unknown>;
      if (
        typeof window.id !== "string" ||
        typeof window.name !== "string" ||
        !Array.isArray(window.panes)
      ) {
        return null;
      }

      const panes: WebTmuxPane[] = [];
      for (const paneValue of window.panes) {
        if (!paneValue || typeof paneValue !== "object") return null;
        const pane = paneValue as Record<string, unknown>;
        if (typeof pane.name !== "string") return null;
        panes.push({ name: pane.name });
      }
      windows.push({ id: window.id, name: window.name, panes });
    }
    sessions.push({ name: session.name, windows });
  }
  return sessions;
}

function parseFavoriteDirs(value: unknown): WebFavoriteDir[] | null {
  if (!Array.isArray(value)) return null;

  const dirs: WebFavoriteDir[] = [];
  for (const dirValue of value) {
    if (!dirValue || typeof dirValue !== "object") return null;
    const dir = dirValue as Record<string, unknown>;
    if (
      typeof dir.name !== "string" ||
      !dir.name ||
      typeof dir.path !== "string" ||
      !dir.path
    ) {
      return null;
    }
    dirs.push({ name: dir.name, path: dir.path });
  }
  return dirs;
}

function parseTerminalSessions(value: unknown): WebTerminalSession[] | null {
  if (!Array.isArray(value)) return null;

  const sessions: WebTerminalSession[] = [];
  for (const sessionValue of value) {
    if (!sessionValue || typeof sessionValue !== "object") return null;
    const session = sessionValue as Record<string, unknown>;
    if (typeof session.id !== "string" || typeof session.name !== "string") {
      return null;
    }
    if (session.kind === "shell") {
      if (typeof session.workingDirectory !== "string") return null;
      sessions.push({
        id: session.id,
        kind: "shell",
        name: session.name,
        workingDirectory: session.workingDirectory,
      });
      continue;
    }
    if (
      session.kind !== "tmux" ||
      typeof session.tmuxSessionName !== "string" ||
      typeof session.tmuxWindowId !== "string" ||
      typeof session.tmuxWindowName !== "string"
    ) {
      return null;
    }
    sessions.push({
      id: session.id,
      kind: "tmux",
      name: session.name,
      tmuxSessionName: session.tmuxSessionName,
      tmuxWindowId: session.tmuxWindowId,
      tmuxWindowName: session.tmuxWindowName,
    });
  }
  return sessions;
}

export function useWebTerminalWorkspaceSocket({
  accessToken,
  enabled,
  localToken,
  runtimeUrl,
}: {
  accessToken: string;
  enabled: boolean;
  localToken: string;
  runtimeUrl: string;
}) {
  const [status, setStatus] = useState<WebTerminalSocketStatus>("disconnected");
  const [terminalSessions, setTerminalSessions] = useState<
    WebTerminalSession[]
  >([]);
  const [activeTerminalSessionId, setActiveTerminalSessionId] = useState<
    string | null
  >(null);
  const [tmuxSessions, setTmuxSessions] = useState<WebTmuxSession[]>([]);
  const [favoriteDirs, setFavoriteDirs] = useState<WebFavoriteDir[]>([]);
  const [stats, setStats] = useState<RuntimeStats | null>(null);
  const [logs, setLogs] = useState("");
  const [toolMessages, setToolMessages] = useState<
    Partial<Record<"codex" | "opencode", RuntimeControlMessage>>
  >({});
  const reconnectAttemptRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef(
    new Set<(message: RuntimeControlMessage) => void>(),
  );

  useEffect(() => {
    if (!enabled || !runtimeUrl || !localToken || !accessToken) {
      setStatus("disconnected");
      setTerminalSessions([]);
      setActiveTerminalSessionId(null);
      setTmuxSessions([]);
      setFavoriteDirs([]);
      setStats(null);
      setLogs("");
      setToolMessages({});
      return;
    }

    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReconnect = () => {
      if (!active || reconnectTimer) return;
      const delay = Math.min(
        INITIAL_RECONNECT_DELAY_MS * 2 ** reconnectAttemptRef.current,
        MAX_RECONNECT_DELAY_MS,
      );
      reconnectAttemptRef.current += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (!active) return;
      setStatus("connecting");

      try {
        const tokens = await requestWebTerminalSocketTokens({
          accessToken,
          localToken,
          runtimeUrl,
        });
        if (!active) return;

        socket = createWebTerminalSocket({
          ...tokens,
          path: "/v2/ws",
          runtimeUrl,
        });
        socketRef.current = socket;
      } catch {
        if (!active) return;
        setStatus("error");
        scheduleReconnect();
        return;
      }

      const currentSocket = socket;
      currentSocket.onopen = () => {
        if (!active || socket !== currentSocket) return;
        reconnectAttemptRef.current = 0;
        setStatus("connected");
        currentSocket.send(
          JSON.stringify({ type: "subscribe", topics: ["stats"] }),
        );
      };
      currentSocket.onmessage = (event) => {
        if (!active || typeof event.data !== "string") return;

        try {
          const message = JSON.parse(event.data) as Record<string, unknown>;
          listenersRef.current.forEach((listener) => listener(message));
          if (message.type === "terminalSessions") {
            const sessions = parseTerminalSessions(message.sessions);
            if (!sessions) return;
            setTerminalSessions(sessions);
            setActiveTerminalSessionId(
              typeof message.activeId === "string" ? message.activeId : null,
            );
          } else if (message.type === "tmuxSessions") {
            const sessions = parseTmuxSessions(message.sessions);
            if (sessions) setTmuxSessions(sessions);
          } else if (message.type === "favoriteDirs") {
            const dirs = parseFavoriteDirs(message.dirs);
            if (dirs) setFavoriteDirs(dirs);
          } else if (message.type === "stats") {
            const data = message.data as Partial<RuntimeStats> | undefined;
            if (
              data &&
              typeof data.cpu_percent === "number" &&
              typeof data.used_percent === "number"
            ) {
              setStats(data as RuntimeStats);
            }
          } else if (
            message.type === "logs" &&
            typeof message.data === "string"
          ) {
            setLogs(message.data.slice(-40_000));
          } else if (
            message.type === "tool" &&
            message.data &&
            typeof message.data === "object" &&
            !Array.isArray(message.data)
          ) {
            const tool = (message.data as Record<string, unknown>).tool;
            if (tool === "codex" || tool === "opencode") {
              setToolMessages((current) => ({ ...current, [tool]: message }));
            }
          }
        } catch {
          // Ignore non-control messages on the workspace socket.
        }
      };
      currentSocket.onerror = () => {
        if (!active || socket !== currentSocket) return;
        setStatus("error");
        currentSocket.close();
      };
      currentSocket.onclose = () => {
        if (!active || socket !== currentSocket) return;
        socket = null;
        socketRef.current = null;
        setStatus("disconnected");
        scheduleReconnect();
      };
    };

    reconnectAttemptRef.current = 0;
    setStats(null);
    setLogs("");
    setToolMessages({});
    void connect();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectAttemptRef.current = 0;
      socketRef.current = null;
      socket?.close(1000, "Web terminal workspace unmounted");
    };
  }, [accessToken, enabled, localToken, runtimeUrl]);

  const sendJsonMessage = useCallback((message: unknown) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }, []);

  const subscribeJsonMessage = useCallback(
    (listener: (message: RuntimeControlMessage) => void) => {
      listenersRef.current.add(listener);
      return () => listenersRef.current.delete(listener);
    },
    [],
  );

  return {
    activeTerminalSessionId,
    favoriteDirs,
    logs,
    sendJsonMessage,
    stats,
    status,
    subscribeJsonMessage,
    terminalSessionIds: terminalSessions.map((session) => session.id),
    terminalSessions,
    tmuxSessions,
    toolMessages,
  };
}
