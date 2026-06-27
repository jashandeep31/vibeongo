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
};

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
}: {
  children: ReactNode;
  socketUrl: string | undefined | null;
}) => {
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const listenersRef = useRef(
    new Set<(message: WebSocketServerMessage) => void>(),
  );
  const messageBufferRef = useRef<WebSocketServerMessage[]>([]);

  // function to send the events to the backend server
  const sendJsonMessage = useCallback(
    (message: unknown) => {
      if (websocket?.readyState !== WebSocket.OPEN) return;
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
    setWebsocket(null);
    messageBufferRef.current = [];
    if (!socketUrl) {
      return;
    }

    const ws = new WebSocket(`wss://${socketUrl}/ws`);

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

    ws.addEventListener("message", handleMessage);

    ws.onopen = () => {
      setWebsocket(ws);
      ws.send(JSON.stringify({ type: "clientReady" }));
    };

    ws.onclose = () => {
      setWebsocket((current) => (current === ws ? null : current));
    };

    return () => {
      ws.removeEventListener("message", handleMessage);
      setWebsocket((current) => (current === ws ? null : current));
      ws.close();
    };
  }, [socketUrl]);

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
