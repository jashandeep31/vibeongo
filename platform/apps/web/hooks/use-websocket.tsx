"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const SocketContext = createContext<{ websocket: WebSocket | null } | null>(
  null,
);

export const WebSocketProvider = ({
  children,
  socketUrl,
}: {
  children: ReactNode;
  socketUrl: string | undefined | null;
}) => {
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    setWebsocket(null);
    if (!socketUrl) {
      return;
    }

    const ws = new WebSocket(`wss://${socketUrl}/ws`);

    ws.onopen = () => {
      setWebsocket(ws);
    };

    ws.onclose = () => {
      setWebsocket((current) => (current === ws ? null : current));
    };

    return () => {
      setWebsocket((current) => (current === ws ? null : current));
      ws.close();
    };
  }, [socketUrl]);

  return (
    <SocketContext.Provider value={{ websocket }}>
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
