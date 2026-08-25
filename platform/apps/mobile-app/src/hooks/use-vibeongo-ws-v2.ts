import { useCallback, useEffect, useRef, useState } from "react";

import {
  createVibeongoWsV2Socket,
  requestVibeongoWsV2Token,
} from "@/lib/vibeongo-ws-v2";

export type VibeongoWsV2Status =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type TmuxPane = { name: string };
export type TmuxWindow = { name: string; panes: TmuxPane[] };
export type TmuxSession = { name: string; windows: TmuxWindow[] };

type VibeongoWsV2Message = {
  activeId?: unknown;
  ids?: unknown;
  sessions?: unknown;
  type?: unknown;
};

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const TERMINAL_CREATION_TIMEOUT_MS = 10_000;

function parseTmuxSessions(value: unknown): TmuxSession[] | null {
  if (!Array.isArray(value)) return null;

  const sessions: TmuxSession[] = [];
  for (const sessionValue of value) {
    if (
      !sessionValue ||
      typeof sessionValue !== "object" ||
      Array.isArray(sessionValue)
    ) {
      return null;
    }
    const session = sessionValue as Record<string, unknown>;
    if (typeof session.name !== "string" || !Array.isArray(session.windows)) {
      return null;
    }

    const windows: TmuxWindow[] = [];
    for (const windowValue of session.windows) {
      if (
        !windowValue ||
        typeof windowValue !== "object" ||
        Array.isArray(windowValue)
      ) {
        return null;
      }
      const window = windowValue as Record<string, unknown>;
      if (typeof window.name !== "string" || !Array.isArray(window.panes)) {
        return null;
      }

      const panes: TmuxPane[] = [];
      for (const paneValue of window.panes) {
        if (
          !paneValue ||
          typeof paneValue !== "object" ||
          Array.isArray(paneValue) ||
          typeof (paneValue as Record<string, unknown>).name !== "string"
        ) {
          return null;
        }
        panes.push({
          name: (paneValue as Record<string, unknown>).name as string,
        });
      }
      windows.push({ name: window.name, panes });
    }
    sessions.push({ name: session.name, windows });
  }
  return sessions;
}

export function useVibeongoWsV2({
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
  const [status, setStatus] = useState<VibeongoWsV2Status>("disconnected");
  const [terminalSessionIds, setTerminalSessionIds] = useState<string[]>([]);
  const [activeTerminalSessionId, setActiveTerminalSessionId] = useState<
    string | null
  >(null);
  const [tmuxSessions, setTmuxSessions] = useState<TmuxSession[]>([]);
  const [isCreatingTerminal, setIsCreatingTerminal] = useState(false);
  const reconnectAttemptRef = useRef(0);
  const creatingTerminalRef = useRef(false);

  useEffect(() => {
    if (!enabled || !runtimeUrl || !localToken || !accessToken) {
      setStatus("disconnected");
      setTerminalSessionIds([]);
      setActiveTerminalSessionId(null);
      setTmuxSessions([]);
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

      let token: string;
      try {
        token = await requestVibeongoWsV2Token({
          accessToken,
          localToken,
          runtimeUrl,
        });
      } catch {
        if (!active) return;
        setStatus("error");
        scheduleReconnect();
        return;
      }
      if (!active) return;

      try {
        socket = createVibeongoWsV2Socket({
          accessToken,
          path: "/v2/ws",
          runtimeUrl,
          token,
        });
      } catch {
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

        let message: VibeongoWsV2Message;
        try {
          message = JSON.parse(event.data) as VibeongoWsV2Message;
        } catch {
          return;
        }

        if (message.type === "sessionIds" && Array.isArray(message.ids)) {
          setTerminalSessionIds(
            message.ids.filter((id): id is string => typeof id === "string"),
          );
          setActiveTerminalSessionId(
            typeof message.activeId === "string" ? message.activeId : null,
          );
          return;
        }

        if (message.type === "tmuxSessions") {
          const sessions = parseTmuxSessions(message.sessions);
          if (sessions) setTmuxSessions(sessions);
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
    setTerminalSessionIds([]);
    setActiveTerminalSessionId(null);
    setTmuxSessions([]);
    void connect();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectAttemptRef.current = 0;
      socket?.close(1000, "Terminal sessions screen unmounted");
    };
  }, [accessToken, enabled, localToken, runtimeUrl]);

  const createTerminalSession = useCallback(async () => {
    if (
      creatingTerminalRef.current ||
      !runtimeUrl ||
      !localToken ||
      !accessToken
    ) {
      return null;
    }

    creatingTerminalRef.current = true;
    setIsCreatingTerminal(true);
    try {
      const token = await requestVibeongoWsV2Token({
        accessToken,
        localToken,
        runtimeUrl,
      });

      return await new Promise<string>((resolve, reject) => {
        const socket = createVibeongoWsV2Socket({
          accessToken,
          path: "/v2/ws/terminal/new",
          runtimeUrl,
          token,
        });
        let settled = false;
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          socket.close();
          reject(new Error("Timed out while creating the terminal session"));
        }, TERMINAL_CREATION_TIMEOUT_MS);

        const finish = (result: { id: string } | { error: Error }) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          socket.close(1000, "Terminal session created");
          if ("id" in result) resolve(result.id);
          else reject(result.error);
        };

        socket.onmessage = (event) => {
          if (typeof event.data !== "string") return;
          try {
            const message = JSON.parse(event.data) as {
              id?: unknown;
              type?: unknown;
            };
            if (message.type === "session" && typeof message.id === "string") {
              finish({ id: message.id });
            }
          } catch {
            // Terminal output is not relevant while creating the session.
          }
        };
        socket.onerror = () =>
          finish({ error: new Error("Could not create terminal session") });
        socket.onclose = () => {
          if (!settled) {
            finish({ error: new Error("Terminal connection closed early") });
          }
        };
      });
    } finally {
      creatingTerminalRef.current = false;
      setIsCreatingTerminal(false);
    }
  }, [accessToken, localToken, runtimeUrl]);

  return {
    activeTerminalSessionId,
    createTerminalSession,
    isCreatingTerminal,
    status,
    terminalSessionIds,
    tmuxSessions,
  };
}
