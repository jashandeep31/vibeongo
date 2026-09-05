"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RuntimeControlMessage = {
  data?: unknown;
  type?: unknown;
};

export type RuntimeControlSocketStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

type RuntimeTool = "codex" | "opencode";

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

function getSocketUrl(runtimeUrl: string, localToken: string) {
  const url = new URL(runtimeUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  url.searchParams.set("token", localToken);
  url.hash = "";
  return url.toString();
}

export function useRuntimeControlSocket({
  enabled,
  localToken,
  runtimeUrl,
}: {
  enabled: boolean;
  localToken: string;
  runtimeUrl: string;
}) {
  const [status, setStatus] =
    useState<RuntimeControlSocketStatus>("disconnected");
  const [toolMessages, setToolMessages] = useState<
    Partial<Record<RuntimeTool, RuntimeControlMessage>>
  >({});
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    if (!enabled || !runtimeUrl || !localToken) {
      setStatus("disconnected");
      setToolMessages({});
      return;
    }

    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReconnect = () => {
      if (!active || reconnectTimer) return;
      const delay = Math.min(
        INITIAL_RECONNECT_DELAY_MS * 2 ** reconnectAttemptRef.current,
        MAX_RECONNECT_DELAY_MS,
      );
      reconnectAttemptRef.current += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (!active) return;
      setStatus("connecting");

      try {
        socket = new WebSocket(getSocketUrl(runtimeUrl, localToken));
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
        currentSocket.send(JSON.stringify({ type: "clientReady" }));
      };
      currentSocket.onmessage = (event) => {
        if (!active || typeof event.data !== "string") return;

        let message: RuntimeControlMessage;
        try {
          message = JSON.parse(event.data) as RuntimeControlMessage;
        } catch {
          return;
        }

        if (
          message.type !== "tool" ||
          !message.data ||
          typeof message.data !== "object" ||
          Array.isArray(message.data)
        ) {
          return;
        }

        const tool = (message.data as Record<string, unknown>).tool;
        if (tool === "codex" || tool === "opencode") {
          setToolMessages((current) => ({ ...current, [tool]: message }));
        }
      };
      currentSocket.onerror = () => {
        if (!active || socket !== currentSocket) return;
        setStatus("error");
        currentSocket.close();
      };
      currentSocket.onclose = () => {
        if (!active || socket !== currentSocket) return;
        socket = null;
        socketRef.current = null;
        setStatus("disconnected");
        scheduleReconnect();
      };
    };

    reconnectAttemptRef.current = 0;
    setToolMessages({});
    connect();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectAttemptRef.current = 0;
      socketRef.current = null;
      socket?.close(1000, "Runtime controls unmounted");
    };
  }, [enabled, localToken, runtimeUrl]);

  const sendJsonMessage = useCallback((message: unknown) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;

    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }, []);

  return { sendJsonMessage, status, toolMessages };
}
