"use client";

import { useEffect, useRef, useState } from "react";

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
export type WebTmuxWindow = { name: string; panes: WebTmuxPane[] };
export type WebTmuxSession = { name: string; windows: WebTmuxWindow[] };
export type WebFavoriteDir = { name: string; path: string };

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
      if (typeof window.name !== "string" || !Array.isArray(window.panes)) {
        return null;
      }

      const panes: WebTmuxPane[] = [];
      for (const paneValue of window.panes) {
        if (!paneValue || typeof paneValue !== "object") return null;
        const pane = paneValue as Record<string, unknown>;
        if (typeof pane.name !== "string") return null;
        panes.push({ name: pane.name });
      }
      windows.push({ name: window.name, panes });
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
  const [terminalSessionIds, setTerminalSessionIds] = useState<string[]>([]);
  const [activeTerminalSessionId, setActiveTerminalSessionId] = useState<
    string | null
  >(null);
  const [tmuxSessions, setTmuxSessions] = useState<WebTmuxSession[]>([]);
  const [favoriteDirs, setFavoriteDirs] = useState<WebFavoriteDir[]>([]);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    if (!enabled || !runtimeUrl || !localToken || !accessToken) {
      setStatus("disconnected");
      setTerminalSessionIds([]);
      setActiveTerminalSessionId(null);
      setTmuxSessions([]);
      setFavoriteDirs([]);
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
      };
      currentSocket.onmessage = (event) => {
        if (!active || typeof event.data !== "string") return;

        try {
          const message = JSON.parse(event.data) as Record<string, unknown>;
          if (message.type === "sessionIds" && Array.isArray(message.ids)) {
            setTerminalSessionIds(
              message.ids.filter((id): id is string => typeof id === "string"),
            );
            setActiveTerminalSessionId(
              typeof message.activeId === "string" ? message.activeId : null,
            );
          } else if (message.type === "tmuxSessions") {
            const sessions = parseTmuxSessions(message.sessions);
            if (sessions) setTmuxSessions(sessions);
          } else if (message.type === "favoriteDirs") {
            const dirs = parseFavoriteDirs(message.dirs);
            if (dirs) setFavoriteDirs(dirs);
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
        setStatus("disconnected");
        scheduleReconnect();
      };
    };

    reconnectAttemptRef.current = 0;
    void connect();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectAttemptRef.current = 0;
      socket?.close(1000, "Web terminal workspace unmounted");
    };
  }, [accessToken, enabled, localToken, runtimeUrl]);

  return {
    activeTerminalSessionId,
    favoriteDirs,
    status,
    terminalSessionIds,
    tmuxSessions,
  };
}
