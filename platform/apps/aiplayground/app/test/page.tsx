"use client";

import { Terminal, useTerminal } from "@wterm/react";
import { useCallback, useEffect, useRef, useState } from "react";
import "@wterm/react/css";

const TERMINAL_WEBSOCKET_URL = "ws://localhost:3101/v2/ws/terminal/new";

function sendTerminalSize(socket: WebSocket, cols: number, rows: number) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify({ type: "resize", cols, rows }));
}

function sendPing(socket: WebSocket) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify({ type: "ping", sentAt: Date.now() }));
}

export default function TestTerminalPage() {
  const { ref, write, focus } = useTerminal();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    const socket = new WebSocket(TERMINAL_WEBSOCKET_URL);
    socket.binaryType = "arraybuffer";
    socketRef.current = socket;

    const handleOpen = () => {
      setIsConnected(true);
      focus();

      const terminal = ref.current?.instance;
      if (terminal) {
        sendTerminalSize(socket, terminal.cols, terminal.rows);
      }

      sendPing(socket);
    };

    const handleMessage = (event: MessageEvent<string | ArrayBuffer>) => {
      if (typeof event.data === "string") {
        try {
          const message: unknown = JSON.parse(event.data);

          if (
            typeof message === "object" &&
            message !== null &&
            "type" in message &&
            message.type === "pong" &&
            "sentAt" in message &&
            typeof message.sentAt === "number"
          ) {
            setLatencyMs(Math.max(0, Date.now() - message.sentAt));
            return;
          }
        } catch {
          // Non-JSON text is terminal output.
        }
      }

      write(
        typeof event.data === "string"
          ? event.data
          : new Uint8Array(event.data),
      );
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setLatencyMs(null);
    };

    const pingInterval = window.setInterval(() => sendPing(socket), 1000);

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleDisconnect);
    socket.addEventListener("close", handleDisconnect);

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleDisconnect);
      socket.removeEventListener("close", handleDisconnect);
      window.clearInterval(pingInterval);
      socket.close();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [focus, ref, write]);

  const handleData = useCallback((data: string) => {
    const socket = socketRef.current;

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(new TextEncoder().encode(data));
    }
  }, []);

  const handleResize = useCallback((cols: number, rows: number) => {
    const socket = socketRef.current;

    if (socket) {
      sendTerminalSize(socket, cols, rows);
    }
  }, []);

  return (
    <main className="relative h-svh w-full overflow-hidden bg-[#1e1e1e]">
      <Terminal
        ref={ref}
        autoResize
        cursorBlink
        onData={handleData}
        onReady={(terminal) => {
          focus();
          handleResize(terminal.cols, terminal.rows);
        }}
        onResize={handleResize}
        className="h-full w-full rounded-none shadow-none"
      />
      <div
        aria-label={
          isConnected ? "WebSocket connected" : "WebSocket disconnected"
        }
        className="absolute top-4 right-4 flex items-center gap-2 font-mono text-xs text-white"
        role="status"
      >
        <span
          className={`size-3 rounded-full ${
            isConnected ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
        <span>{latencyMs === null ? "--" : latencyMs} ms</span>
      </div>
    </main>
  );
}
