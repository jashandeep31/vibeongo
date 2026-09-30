import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  type FavoriteDir,
  parseFavoriteDirs,
  parseTerminalSessions,
  parseTmuxSessions,
  type TmuxSession,
  type VibeongoTerminalSession,
} from "@/hooks/use-vibeongo-ws-v2";
import {
  createVibeongoWsV2Socket,
  requestVibeongoWsV2Token,
} from "@/lib/vibeongo-ws-v2";

type RuntimeSocketStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type RuntimeSocketStats = {
  cpu_percent: number;
  free: number;
  time: string;
  total: number;
  used: number;
  used_percent: number;
};

export type RuntimeSocketMessage = {
  activeId?: unknown;
  data?: unknown;
  dirs?: unknown;
  hasBuffer?: unknown;
  ids?: unknown;
  sessionId?: unknown;
  sessions?: unknown;
  type?: unknown;
};

type RuntimeTool = "codex" | "opencode";
type RuntimeToolMessages = Partial<Record<RuntimeTool, RuntimeSocketMessage>>;

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

function isRuntimeStats(value: unknown): value is RuntimeSocketStats {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const stats = value as Record<string, unknown>;
  return (
    typeof stats.cpu_percent === "number" &&
    typeof stats.used_percent === "number" &&
    typeof stats.total === "number" &&
    typeof stats.used === "number" &&
    typeof stats.free === "number" &&
    typeof stats.time === "string"
  );
}

export function useVibeongoRuntimeSocket({
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
  const [status, setStatus] = useState<RuntimeSocketStatus>("disconnected");
  const [stats, setStats] = useState<RuntimeSocketStats | null>(null);
  const [logs, setLogs] = useState("");
  const [lastMessage, setLastMessage] = useState<RuntimeSocketMessage | null>(
    null,
  );
  const [toolMessages, setToolMessages] = useState<RuntimeToolMessages>({});
  // The server pushes the terminal workspace lists to every /v2/ws
  // connection, whenever they change.
  const [terminalSessions, setTerminalSessions] = useState<
    VibeongoTerminalSession[]
  >([]);
  const [activeTerminalSessionId, setActiveTerminalSessionId] = useState<
    string | null
  >(null);
  const [tmuxSessions, setTmuxSessions] = useState<TmuxSession[]>([]);
  const [favoriteDirs, setFavoriteDirs] = useState<FavoriteDir[]>([]);
  const messageListenersRef = useRef(
    new Set<(message: RuntimeSocketMessage) => void>(),
  );
  const reconnectAttemptRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !runtimeUrl || !localToken || !accessToken) {
      setStatus("disconnected");
      setStats(null);
      setLogs("");
      setLastMessage(null);
      setToolMessages({});
      setTerminalSessions([]);
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
        const token = await requestVibeongoWsV2Token({
          accessToken,
          localToken,
          runtimeUrl,
        });
        if (!active) return;
        socket = createVibeongoWsV2Socket({
          accessToken,
          path: "/v2/ws",
          runtimeUrl,
          token,
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
          JSON.stringify({ type: "subscribe", topics: ["stats", "logs"] }),
        );
      };
      currentSocket.onmessage = (event) => {
        if (!active || typeof event.data !== "string") return;
        let message: RuntimeSocketMessage;
        try {
          message = JSON.parse(event.data) as RuntimeSocketMessage;
        } catch {
          return;
        }
        if (message.type === "terminalSessions") {
          const sessions = parseTerminalSessions(message.sessions);
          if (!sessions) return;
          setTerminalSessions(sessions);
          setActiveTerminalSessionId(
            typeof message.activeId === "string" ? message.activeId : null,
          );
          return;
        }
        if (message.type === "tmuxSessions") {
          const sessions = parseTmuxSessions(message.sessions);
          if (sessions) setTmuxSessions(sessions);
          return;
        }
        if (message.type === "favoriteDirs") {
          const dirs = parseFavoriteDirs(message.dirs);
          if (dirs) setFavoriteDirs(dirs);
          return;
        }

        if (message.type !== "terminal") {
          setLastMessage(message);
        }
        messageListenersRef.current.forEach((listener) => listener(message));

        if (
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

        if (message.type === "stats" && isRuntimeStats(message.data)) {
          setStats(message.data);
        } else if (
          message.type === "logs" &&
          typeof message.data === "string"
        ) {
          setLogs(message.data.slice(-40_000));
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
    setLastMessage(null);
    setToolMessages({});
    setTerminalSessions([]);
    setActiveTerminalSessionId(null);
    setTmuxSessions([]);
    setFavoriteDirs([]);
    void connect();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectAttemptRef.current = 0;
      socketRef.current = null;
      socket?.close(1000, "Runtime socket disabled");
    };
  }, [accessToken, enabled, localToken, runtimeUrl]);

  const sendJsonMessage = useCallback((message: unknown) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      socketRef.current.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }, []);

  const subscribeJsonMessage = useCallback(
    (listener: (message: RuntimeSocketMessage) => void) => {
      messageListenersRef.current.add(listener);
      return () => {
        messageListenersRef.current.delete(listener);
      };
    },
    [],
  );

  return useMemo(
    () => ({
      activeTerminalSessionId,
      favoriteDirs,
      lastMessage,
      logs,
      sendJsonMessage,
      stats,
      status,
      subscribeJsonMessage,
      terminalSessions,
      tmuxSessions,
      toolMessages,
    }),
    [
      activeTerminalSessionId,
      favoriteDirs,
      lastMessage,
      logs,
      sendJsonMessage,
      stats,
      status,
      subscribeJsonMessage,
      terminalSessions,
      tmuxSessions,
      toolMessages,
    ],
  );
}

export type RuntimeSocketSnapshot = ReturnType<
  typeof useVibeongoRuntimeSocket
>;

const EMPTY_RUNTIME_SOCKET: RuntimeSocketSnapshot = {
  activeTerminalSessionId: null,
  favoriteDirs: [],
  lastMessage: null,
  logs: "",
  sendJsonMessage: () => false,
  stats: null,
  status: "disconnected",
  subscribeJsonMessage: () => () => {},
  terminalSessions: [],
  tmuxSessions: [],
  toolMessages: {},
};

// ProjectStoreSync owns one runtime socket per project session and publishes
// it here, so any screen of that session reads the same connection. It also
// carries the terminal workspace lists (terminals, tmux, favourite folders).
const runtimeSockets = new Map<string, RuntimeSocketSnapshot>();
const runtimeSocketListeners = new Set<() => void>();

export function publishRuntimeSocket(
  projectSessionId: string,
  snapshot: RuntimeSocketSnapshot | undefined,
) {
  if (snapshot) runtimeSockets.set(projectSessionId, snapshot);
  else if (!runtimeSockets.delete(projectSessionId)) return;
  runtimeSocketListeners.forEach((listener) => listener());
}

function subscribeRuntimeSockets(listener: () => void) {
  runtimeSocketListeners.add(listener);
  return () => {
    runtimeSocketListeners.delete(listener);
  };
}

export function useSessionRuntimeSocket(projectSessionId: string) {
  const getSnapshot = useCallback(
    () => runtimeSockets.get(projectSessionId) ?? EMPTY_RUNTIME_SOCKET,
    [projectSessionId],
  );
  return useSyncExternalStore(
    subscribeRuntimeSockets,
    getSnapshot,
    getSnapshot,
  );
}
