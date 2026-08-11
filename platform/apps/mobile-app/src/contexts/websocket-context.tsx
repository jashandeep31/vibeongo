import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BACKEND_URL } from "@/lib/api";

const DEVELOPMENT_USER_ID = "634c805d-c70a-4333-9214-65d3fafc9481";
const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export type WebSocketMessage = {
  type?: unknown;
  data?: unknown;
};

export type WebSocketStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

type MessageListener = (message: WebSocketMessage) => void;

type WebSocketContextValue = {
  isConnected: boolean;
  sendJsonMessage: (message: unknown) => boolean;
  status: WebSocketStatus;
  subscribeJsonMessage: (listener: MessageListener) => () => void;
};

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

function getWebSocketUrl() {
  const url = new URL(BACKEND_URL);
  if (url.protocol === "https:") url.protocol = "wss:";
  else if (url.protocol === "http:") url.protocol = "ws:";
  else throw new Error("EXPO_PUBLIC_BACKEND_URL must use HTTP or HTTPS");

  url.pathname = "/ws";
  url.search = "";
  url.hash = "";
  if (__DEV__) url.searchParams.set("developmentUserId", DEVELOPMENT_USER_ID);
  return url.toString();
}

export function WebSocketProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<WebSocketStatus>("connecting");
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef(new Set<MessageListener>());
  const reconnectAttemptRef = useRef(0);

  const sendJsonMessage = useCallback((message: unknown) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }, []);

  const subscribeJsonMessage = useCallback((listener: MessageListener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  useEffect(() => {
    let active = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!active) return;
      setStatus("connecting");

      let socket: WebSocket;
      try {
        socket = new WebSocket(getWebSocketUrl());
      } catch {
        setStatus("error");
        scheduleReconnect();
        return;
      }

      socketRef.current = socket;
      socket.onopen = () => {
        if (!active || socketRef.current !== socket) return;
        reconnectAttemptRef.current = 0;
        setStatus("connected");
      };
      socket.onmessage = (event) => {
        if (!active || typeof event.data !== "string") return;
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          listenersRef.current.forEach((listener) => listener(message));
        } catch {
          // Ignore malformed messages without taking down the live connection.
        }
      };
      socket.onerror = () => {
        if (active && socketRef.current === socket) setStatus("error");
      };
      socket.onclose = () => {
        if (!active || socketRef.current !== socket) return;
        socketRef.current = null;
        setStatus("disconnected");
        scheduleReconnect();
      };
    };

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

    connect();
    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socketRef.current?.close(1000, "App signed out");
      socketRef.current = null;
    };
  }, []);

  const value = useMemo(
    () => ({
      isConnected: status === "connected",
      sendJsonMessage,
      status,
      subscribeJsonMessage,
    }),
    [sendJsonMessage, status, subscribeJsonMessage],
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context)
    throw new Error("useWebSocket must be used inside WebSocketProvider");
  return context;
}
