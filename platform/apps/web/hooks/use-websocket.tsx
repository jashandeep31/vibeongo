import { useContext, useState, createContext, useEffect } from "react";

const SocketContext = createContext<null | WebSocket>(null);

export const WebSocketPorvider = ({
  children,
  socketUrl,
}: {
  children: React.ReactNode;
  socketUrl: string | undefined | null;
}) => {
  const [websocket, SetWebsocket] = useState<null | WebSocket>(null);
  useEffect(() => {
    if (!socketUrl) return;
    const ws = new WebSocket(`wss://${socketUrl}/ws`);
    console.log(socketUrl);

    ws.onopen = () => {
      SetWebsocket(ws);
    };

    return () => {
      ws.close();
    };
  }, [socketUrl]);

  return (
    <SocketContext.Provider value={websocket}>
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
