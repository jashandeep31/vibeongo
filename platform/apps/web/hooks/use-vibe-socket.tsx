"use client";

import { BACKEND_URL } from "@/lib/constants";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const VibeSocketContext = createContext<{
  websocket: WebSocket | null;
  sendJsonMessage: (message: unknown) => void;
} | null>(null);

export const VibeSocketProvider = ({ children }: { children: ReactNode }) => {
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);

  const sendJsonMessage = useCallback(
    (message: unknown) => {
      if (websocket?.readyState !== WebSocket.OPEN) return;
      websocket.send(JSON.stringify(message));
    },
    [websocket],
  );

  useEffect(() => {
    setWebsocket(null);

    const vibeSocket = new WebSocket(
      BACKEND_URL.replace("https", "wss") + "/ws",
    );

    vibeSocket.onopen = () => {
      setWebsocket(vibeSocket);
    };

    vibeSocket.onclose = () => {
      setWebsocket((current) => (current === vibeSocket ? null : current));
    };

    vibeSocket.onerror = () => {
      setWebsocket((current) => (current === vibeSocket ? null : current));
    };

    return () => {
      setWebsocket((current) => (current === vibeSocket ? null : current));
      vibeSocket.close();
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
