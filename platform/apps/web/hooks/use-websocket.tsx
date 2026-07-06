"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type WebSocketServerMessage = {
  type?: unknown;
  data?: unknown;
  ids?: unknown;
  activeId?: unknown;
  sessionId?: unknown;
  hasBuffer?: unknown;
};

export type WebSocketToolMessageData = {
  tool?: unknown;
  status?: unknown;
  error?: unknown;
  password?: unknown;
};

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const MAX_PENDING_MESSAGES = 1000;

const SocketContext = createContext<{
  websocket: WebSocket | null;
  sendJsonMessage: (message: unknown) => void;
  subscribeJsonMessage: (
    listener: (message: WebSocketServerMessage) => void,
    options?: { replay?: boolean },
  ) => () => void;
} | null>(null);

export const WebSocketProvider = ({
  children,
  socketUrl,
  socketToken,
}: {
  children: ReactNode;
  socketUrl: string | undefined | null;
  socketToken: string | undefined | null;
}) => {
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const listenersRef = useRef(
    new Set<(message: WebSocketServerMessage) => void>(),
  );
  const messageBufferRef = useRef<WebSocketServerMessage[]>([]);
  const pendingMessagesRef = useRef<unknown[]>([]);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // function to send the events to the backend server
  const sendJsonMessage = useCallback(
    (message: unknown) => {
      if (websocket?.readyState !== WebSocket.OPEN) {
        pendingMessagesRef.current.push(message);
        if (pendingMessagesRef.current.length > MAX_PENDING_MESSAGES) {
          pendingMessagesRef.current.splice(
            0,
            pendingMessagesRef.current.length - MAX_PENDING_MESSAGES,
          );
        }
        return;
      }

      websocket.send(JSON.stringify(message));
    },
    [websocket],
  );

  const subscribeJsonMessage = useCallback(
    (
      listener: (message: WebSocketServerMessage) => void,
      options?: { replay?: boolean },
    ) => {
      listenersRef.current.add(listener);

      if (options?.replay !== false) {
        for (const message of messageBufferRef.current) {
          listener(message);
        }
      }

      return () => {
        listenersRef.current.delete(listener);
      };
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;
    let currentSocket: WebSocket | null = null;

    setWebsocket(null);
    messageBufferRef.current = [];
    pendingMessagesRef.current = [];
    reconnectAttemptRef.current = 0;
    if (!socketUrl || !socketToken) {
      return;
    }

    const wsUrl = `wss://${socketUrl}/ws?token=${encodeURIComponent(socketToken)}`;

    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") {
        return;
      }

      let message: WebSocketServerMessage;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      messageBufferRef.current.push(message);
      if (messageBufferRef.current.length > 5000) {
        messageBufferRef.current.splice(
          0,
          messageBufferRef.current.length - 5000,
        );
      }

      if (message.type === "stats") {
        window.dispatchEvent(
          new CustomEvent("vps-stats", { detail: message.data }),
        );
      }

      if (message.type === "logs") {
        window.dispatchEvent(
          new CustomEvent("vps-logs", { detail: message.data }),
        );
      }

      for (const listener of listenersRef.current) {
        listener(message);
      }
    };

    const clearReconnectTimeout = () => {
      if (!reconnectTimeoutRef.current) return;

      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    };

    const scheduleReconnect = () => {
      if (!isMounted || reconnectTimeoutRef.current) return;

      const delay = Math.min(
        INITIAL_RECONNECT_DELAY_MS * 2 ** reconnectAttemptRef.current,
        MAX_RECONNECT_DELAY_MS,
      );

      reconnectAttemptRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect();
      }, delay);
    };

    const connect = () => {
      clearReconnectTimeout();
      setWebsocket(null);

      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        scheduleReconnect();
        return;
      }

      currentSocket = ws;
      ws.addEventListener("message", handleMessage);

      ws.onopen = () => {
        if (!isMounted) return;

        reconnectAttemptRef.current = 0;
        setWebsocket(ws);
        ws.send(JSON.stringify({ type: "clientReady" }));

        const pendingMessages = pendingMessagesRef.current.splice(0);
        for (const message of pendingMessages) {
          ws.send(JSON.stringify(message));
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;

        ws.removeEventListener("message", handleMessage);
        setWebsocket((current) => (current === ws ? null : current));
        if (currentSocket === ws) {
          currentSocket = null;
        }
        scheduleReconnect();
      };

      ws.onerror = () => {
        if (!isMounted) return;

        setWebsocket((current) => (current === ws ? null : current));
        ws.close();
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearReconnectTimeout();
      currentSocket?.removeEventListener("message", handleMessage);
      setWebsocket((current) => (current === currentSocket ? null : current));
      currentSocket?.close();
    };
  }, [socketUrl, socketToken]);

  return (
    <SocketContext.Provider
      value={{ websocket, sendJsonMessage, subscribeJsonMessage }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const ctx = useContext(SocketContext);

  if (!ctx) {
    throw new Error(
      "useWebSocketContext must be used inside WebSocketProvider",
    );
  }
  return ctx;
};
