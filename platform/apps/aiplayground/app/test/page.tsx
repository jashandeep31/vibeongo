"use client";

import { Terminal, useTerminal } from "@wterm/react";
import { useCallback, useEffect, useRef, useState } from "react";
import "@wterm/react/css";

const TERMINAL_WEBSOCKET_URL = "ws://localhost:3101/v2/ws/terminal/new";

export default function TestTerminalPage() {
  const { ref, write, focus } = useTerminal();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(TERMINAL_WEBSOCKET_URL);
    socket.binaryType = "arraybuffer";
    socketRef.current = socket;

    const handleOpen = () => {
      setIsConnected(true);
      focus();
    };

    const handleMessage = (event: MessageEvent<string | ArrayBuffer>) => {
      write(
        typeof event.data === "string"
          ? event.data
          : new Uint8Array(event.data),
      );
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleDisconnect);
    socket.addEventListener("close", handleDisconnect);

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleDisconnect);
      socket.removeEventListener("close", handleDisconnect);
      socket.close();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [focus, write]);

  const handleData = useCallback((data: string) => {
    const socket = socketRef.current;

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  }, []);

  return (
    <main className="relative h-svh w-full overflow-hidden bg-[#1e1e1e]">
      <Terminal
        ref={ref}
        autoResize
        cursorBlink
        onData={handleData}
        onReady={focus}
        className="h-full w-full rounded-none shadow-none"
      />
      <span
        aria-label={
          isConnected ? "WebSocket connected" : "WebSocket disconnected"
        }
        className={`absolute top-4 right-4 size-3 rounded-full ${
          isConnected ? "bg-emerald-500" : "bg-red-500"
        }`}
        role="status"
      />
    </main>
  );
}
