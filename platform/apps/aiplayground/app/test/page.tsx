"use client";

import { Terminal, useTerminal } from "@wterm/react";
import { useCallback, useEffect, useRef, useState } from "react";
import "@wterm/react/css";

const TERMINAL_WEBSOCKET_URL = "ws://localhost:3101/v2/ws/terminal";
const TERMINAL_SESSION_STORAGE_KEY = "test-terminal-session-id";
const RECONNECT_DELAY_MS = 500;

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
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let reconnectTimeout: number | undefined;
    let storedSessionId = window.localStorage.getItem(
      TERMINAL_SESSION_STORAGE_KEY,
    );

    setSessionId(storedSessionId);

    const connect = () => {
      let confirmedSession = false;
      const requestedSession = storedSessionId ?? "new";
      const socket = new WebSocket(
        `${TERMINAL_WEBSOCKET_URL}/${encodeURIComponent(requestedSession)}`,
      );
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setIsConnected(true);
        focus();

        const terminal = ref.current?.instance;
        if (terminal) {
          sendTerminalSize(socket, terminal.cols, terminal.rows);
        }

        sendPing(socket);
      });

      socket.addEventListener(
        "message",
        (event: MessageEvent<string | ArrayBuffer>) => {
          if (typeof event.data === "string") {
            try {
              const message: unknown = JSON.parse(event.data);

              if (
                typeof message === "object" &&
                message !== null &&
                "type" in message
              ) {
                if (
                  message.type === "session" &&
                  "id" in message &&
                  typeof message.id === "string"
                ) {
                  confirmedSession = true;
                  storedSessionId = message.id;
                  window.localStorage.setItem(
                    TERMINAL_SESSION_STORAGE_KEY,
                    message.id,
                  );
                  setSessionId(message.id);
                  // The server follows this message with the full stored buffer.
                  write("\x1bc");
                  return;
                }

                if (
                  message.type === "pong" &&
                  "sentAt" in message &&
                  typeof message.sentAt === "number"
                ) {
                  setLatencyMs(Math.max(0, Date.now() - message.sentAt));
                  return;
                }
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
        },
      );

      socket.addEventListener("close", () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        setIsConnected(false);
        setLatencyMs(null);

        if (!confirmedSession) {
          storedSessionId = null;
          window.localStorage.removeItem(TERMINAL_SESSION_STORAGE_KEY);
          setSessionId(null);
        }

        if (!disposed) {
          reconnectTimeout = window.setTimeout(connect, RECONNECT_DELAY_MS);
        }
      });
    };

    connect();
    const pingInterval = window.setInterval(() => {
      const socket = socketRef.current;
      if (socket) {
        sendPing(socket);
      }
    }, 1000);

    return () => {
      disposed = true;
      window.clearInterval(pingInterval);
      if (reconnectTimeout !== undefined) {
        window.clearTimeout(reconnectTimeout);
      }
      socketRef.current?.close();
      socketRef.current = null;
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
        <span>
          {sessionId ? sessionId.slice(0, 8) : "new"} ·{" "}
          {latencyMs === null ? "--" : latencyMs} ms
        </span>
      </div>
    </main>
  );
}
