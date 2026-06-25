"use client";

import { BACKEND_URL } from "@/lib/constants";
import { useCallback, useEffect, useState } from "react";

export const useVibeSocket = () => {
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

    const ws = new WebSocket(BACKEND_URL.replace("https", "wss") + "/ws");

    ws.onopen = () => {
      setWebsocket(ws);
    };

    ws.onclose = () => {
      setWebsocket((current) => (current === ws ? null : current));
    };

    ws.onerror = () => {
      setWebsocket((current) => (current === ws ? null : current));
    };

    return () => {
      setWebsocket((current) => (current === ws ? null : current));
      ws.close();
    };
  }, []);

  return { websocket, sendJsonMessage };
};
