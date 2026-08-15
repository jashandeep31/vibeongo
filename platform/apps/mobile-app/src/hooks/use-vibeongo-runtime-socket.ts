import { useCallback, useEffect, useRef, useState } from "react";

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
  data?: unknown;
  type?: unknown;
};

type RuntimeTool = "codex" | "opencode";
type RuntimeToolMessages = Partial<Record<RuntimeTool, RuntimeSocketMessage>>;

type ReactNativeWebSocketConstructor = new (
  url: string,
  protocols?: string[],
  options?: { headers?: Record<string, string> },
) => WebSocket;

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

function getRuntimeSocketUrl(runtimeUrl: string, localToken: string) {
  const url = new URL(runtimeUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  url.searchParams.set("token", localToken);
  url.hash = "";
  return url.toString();
}

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
        connect();
      }, delay);
    };

    const connect = () => {
      if (!active) return;
      setStatus("connecting");

      try {
        const NativeWebSocket =
          WebSocket as unknown as ReactNativeWebSocketConstructor;
        socket = new NativeWebSocket(
          getRuntimeSocketUrl(runtimeUrl, localToken),
          [],
          {
            headers: {
              "X-Vibeongo-Proxy-Authorization": `Bearer ${accessToken}`,
            },
          },
        );
        socketRef.current = socket;
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
        currentSocket.send(JSON.stringify({ type: "clientReady" }));
      };
      currentSocket.onmessage = (event) => {
        if (!active || typeof event.data !== "string") return;
        let message: RuntimeSocketMessage;
        try {
          message = JSON.parse(event.data) as RuntimeSocketMessage;
        } catch {
          return;
        }
        setLastMessage(message);
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
    connect();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectAttemptRef.current = 0;
      socketRef.current = null;
      socket?.close(1000, "Runtime screen unmounted");
    };
  }, [accessToken, enabled, localToken, runtimeUrl]);

  const sendJsonMessage = (message: unknown) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }
    socketRef.current.send(JSON.stringify(message));
    return true;
  };

  const subscribeJsonMessage = useCallback(
    (listener: (message: RuntimeSocketMessage) => void) => {
      messageListenersRef.current.add(listener);
      return () => {
        messageListenersRef.current.delete(listener);
      };
    },
    [],
  );

  return {
    lastMessage,
    logs,
    sendJsonMessage,
    stats,
    status,
    subscribeJsonMessage,
    toolMessages,
  };
}
