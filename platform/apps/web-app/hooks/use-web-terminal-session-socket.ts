"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createWebTerminalSocket,
  requestWebTerminalSocketTokens,
} from "@/lib/web-terminal-socket";
import type { WebTerminalSocketStatus } from "@/hooks/use-web-terminal-workspace-socket";

export type WebTerminalEvent =
  | { type: "output"; data: string }
  | { type: "session"; hasBuffer: boolean; id: string };

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const PING_INTERVAL_MS = 15_000;

async function decodeTerminalOutput(data: unknown) {
  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(data));
  }
  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    );
  }
  if (data instanceof Blob) {
    return new TextDecoder().decode(new Uint8Array(await data.arrayBuffer()));
  }
  return null;
}

export function useWebTerminalSessionSocket({
  accessToken,
  enabled,
  localToken,
  runtimeUrl,
  sessionId,
}: {
  accessToken: string;
  enabled: boolean;
  localToken: string;
  runtimeUrl: string;
  sessionId: string;
}) {
  const [status, setStatus] = useState<WebTerminalSocketStatus>("disconnected");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [connectedSessionId, setConnectedSessionId] = useState<string | null>(
    null,
  );
  const listenersRef = useRef(new Set<(event: WebTerminalEvent) => void>());
  const reconnectAttemptRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !runtimeUrl || !localToken || !accessToken || !sessionId) {
      setStatus("disconnected");
      setLatencyMs(null);
      setConnectedSessionId(null);
      return;
    }

    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const clearPingTimer = () => {
      if (!pingTimer) return;
      clearInterval(pingTimer);
      pingTimer = null;
    };
    const emit = (event: WebTerminalEvent) => {
      listenersRef.current.forEach((listener) => listener(event));
    };
    const scheduleReconnect = () => {
      if (!active || reconnectTimer || sessionId === "new") return;
      const delay = Math.min(
        INITIAL_RECONNECT_DELAY_MS * 2 ** reconnectAttemptRef.current,
        MAX_RECONNECT_DELAY_MS,
      );
      reconnectAttemptRef.current += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (!active) return;
      setStatus("connecting");

      try {
        const tokens = await requestWebTerminalSocketTokens({
          accessToken,
          localToken,
          runtimeUrl,
        });
        if (!active) return;

        socket = createWebTerminalSocket({
          ...tokens,
          path: `/v2/ws/terminal/${encodeURIComponent(sessionId)}`,
          runtimeUrl,
        });
        socket.binaryType = "arraybuffer";
        socketRef.current = socket;
      } catch {
        if (!active) return;
        setStatus("error");
        scheduleReconnect();
        return;
      }

      const currentSocket = socket;
      currentSocket.onopen = () => {
        if (!active || socket !== currentSocket) return;
        reconnectAttemptRef.current = 0;
        setStatus("connected");
        currentSocket.send(
          JSON.stringify({ type: "ping", sentAt: Date.now() }),
        );
        clearPingTimer();
        pingTimer = setInterval(() => {
          if (currentSocket.readyState === WebSocket.OPEN) {
            currentSocket.send(
              JSON.stringify({ type: "ping", sentAt: Date.now() }),
            );
          }
        }, PING_INTERVAL_MS);
      };
      currentSocket.onmessage = (event) => {
        if (!active || socket !== currentSocket) return;

        if (typeof event.data === "string") {
          try {
            const message = JSON.parse(event.data) as Record<string, unknown>;
            if (message.type === "session" && typeof message.id === "string") {
              setConnectedSessionId(message.id);
              emit({
                type: "session",
                hasBuffer: message.hasBuffer === true,
                id: message.id,
              });
            } else if (
              message.type === "pong" &&
              typeof message.sentAt === "number"
            ) {
              setLatencyMs(Math.max(0, Date.now() - message.sentAt));
            }
            return;
          } catch {
            emit({ type: "output", data: event.data });
            return;
          }
        }

        void decodeTerminalOutput(event.data).then((output) => {
          if (active && socket === currentSocket && output !== null) {
            emit({ type: "output", data: output });
          }
        });
      };
      currentSocket.onerror = () => {
        if (!active || socket !== currentSocket) return;
        setStatus("error");
        currentSocket.close();
      };
      currentSocket.onclose = () => {
        if (!active || socket !== currentSocket) return;
        clearPingTimer();
        socket = null;
        socketRef.current = null;
        setLatencyMs(null);
        setStatus("disconnected");
        scheduleReconnect();
      };
    };

    reconnectAttemptRef.current = 0;
    setConnectedSessionId(null);
    void connect();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearPingTimer();
      reconnectAttemptRef.current = 0;
      socketRef.current = null;
      socket?.close(1000, "Web terminal session unmounted");
    };
  }, [accessToken, enabled, localToken, runtimeUrl, sessionId]);

  const sendInput = useCallback((data: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(new TextEncoder().encode(data));
      return true;
    } catch {
      return false;
    }
  }, []);

  const sendResize = useCallback((cols: number, rows: number) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(JSON.stringify({ cols, rows, type: "resize" }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const subscribe = useCallback(
    (listener: (event: WebTerminalEvent) => void) => {
      listenersRef.current.add(listener);
      return () => listenersRef.current.delete(listener);
    },
    [],
  );

  return {
    connectedSessionId,
    latencyMs,
    sendInput,
    sendResize,
    status,
    subscribe,
  };
}
