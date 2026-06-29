"use client";

import { BACKEND_URL } from "@/lib/constants";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

const VibeSocketContext = createContext<{
  websocket: WebSocket | null;
  sendJsonMessage: (message: unknown) => void;
} | null>(null);

export const VibeSocketProvider = ({ children }: { children: ReactNode }) => {
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const pendingMessagesRef = useRef<unknown[]>([]);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const sendJsonMessage = useCallback(
    (message: unknown) => {
      if (websocket?.readyState !== WebSocket.OPEN) {
        pendingMessagesRef.current.push(message);
        return;
      }

      websocket.send(JSON.stringify(message));
    },
    [websocket],
  );

  useEffect(() => {
    let isMounted = true;
    let currentSocket: WebSocket | null = null;

    const socketUrl = BACKEND_URL.replace("https", "wss") + "/ws";

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

      let vibeSocket: WebSocket;
      try {
        vibeSocket = new WebSocket(socketUrl);
      } catch {
        scheduleReconnect();
        return;
      }

      currentSocket = vibeSocket;

      vibeSocket.onopen = () => {
        if (!isMounted) return;

        reconnectAttemptRef.current = 0;
        setWebsocket(vibeSocket);

        const pendingMessages = pendingMessagesRef.current.splice(0);
        for (const message of pendingMessages) {
          vibeSocket.send(JSON.stringify(message));
        }
      };

      vibeSocket.onclose = () => {
        if (!isMounted) return;

        setWebsocket((current) => (current === vibeSocket ? null : current));
        if (currentSocket === vibeSocket) {
          currentSocket = null;
        }
        scheduleReconnect();
      };

      vibeSocket.onerror = () => {
        if (!isMounted) return;

        setWebsocket((current) => (current === vibeSocket ? null : current));
        vibeSocket.close();
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearReconnectTimeout();
      setWebsocket((current) => (current === currentSocket ? null : current));
      currentSocket?.close();
    };
  }, []);

  return (
    <VibeSocketContext.Provider value={{ websocket, sendJsonMessage }}>
      {children}
    </VibeSocketContext.Provider>
  );
};

export const useVibeSocket = () => {
  const ctx = useContext(VibeSocketContext);

  if (!ctx) {
    throw new Error("useVibeSocket must be used inside VibeSocketProvider");
  }

  return ctx;
};
