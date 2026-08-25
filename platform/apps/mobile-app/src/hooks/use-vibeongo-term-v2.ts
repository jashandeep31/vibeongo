import { useCallback, useEffect, useRef, useState } from "react";

import {
  createVibeongoWsV2Socket,
  requestVibeongoWsV2Token,
} from "@/lib/vibeongo-ws-v2";

export type VibeongoTermV2Status =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type VibeongoTermV2Event =
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
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return new TextDecoder().decode(new Uint8Array(await data.arrayBuffer()));
  }
  return null;
}

export function useVibeongoTermV2({
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
  const [status, setStatus] = useState<VibeongoTermV2Status>("disconnected");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const listenersRef = useRef(new Set<(event: VibeongoTermV2Event) => void>());
  const reconnectAttemptRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);

  const emit = (event: VibeongoTermV2Event) => {
    listenersRef.current.forEach((listener) => listener(event));
  };

  useEffect(() => {
    if (!enabled || !runtimeUrl || !localToken || !accessToken || !sessionId) {
      setStatus("disconnected");
      setLatencyMs(null);
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

    const scheduleReconnect = () => {
      if (!active || reconnectTimer) return;
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

      let token: string;
      try {
        token = await requestVibeongoWsV2Token({
          accessToken,
          localToken,
          runtimeUrl,
        });
      } catch {
        if (!active) return;
        setStatus("error");
        scheduleReconnect();
        return;
      }
      if (!active) return;

      try {
        socket = createVibeongoWsV2Socket({
          accessToken,
          path: `/v2/ws/terminal/${encodeURIComponent(sessionId)}`,
          runtimeUrl,
          token,
        });
        socket.binaryType = "arraybuffer";
        socketRef.current = socket;
      } catch {
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
      currentSocket.onmessage = (messageEvent) => {
        if (!active || socket !== currentSocket) return;

        if (typeof messageEvent.data === "string") {
          try {
            const message = JSON.parse(messageEvent.data) as {
              hasBuffer?: unknown;
              id?: unknown;
              sentAt?: unknown;
              type?: unknown;
            };
            if (message.type === "session" && typeof message.id === "string") {
              emit({
                hasBuffer: message.hasBuffer === true,
                id: message.id,
                type: "session",
              });
            } else if (
              message.type === "pong" &&
              typeof message.sentAt === "number"
            ) {
              setLatencyMs(Math.max(0, Date.now() - message.sentAt));
            }
            return;
          } catch {
            emit({ data: messageEvent.data, type: "output" });
            return;
          }
        }

        void decodeTerminalOutput(messageEvent.data).then((output) => {
          if (active && socket === currentSocket && output) {
            emit({ data: output, type: "output" });
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
    void connect();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearPingTimer();
      reconnectAttemptRef.current = 0;
      socketRef.current = null;
      socket?.close(1000, "Terminal screen unmounted");
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
    (listener: (event: VibeongoTermV2Event) => void) => {
      listenersRef.current.add(listener);
      return () => {
        listenersRef.current.delete(listener);
      };
    },
    [],
  );

  return { latencyMs, sendInput, sendResize, status, subscribe };
}
