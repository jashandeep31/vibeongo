"use client";

import { BACKEND_URL } from "@/lib/constants";
import { useCallback, useEffect, useRef, useState } from "react";

export type WebSocketMessage = {
  type?: unknown;
  data?: unknown;
};

export type WebSocketStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

type MessageListener<TMessage> = (message: TMessage) => void;

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

const getWebSocketUrl = () => {
  const url = new URL(BACKEND_URL);

  if (url.protocol === "https:") {
    url.protocol = "wss:";
  } else if (url.protocol === "http:") {
    url.protocol = "ws:";
  } else {
    throw new Error("NEXT_PUBLIC_BACKEND_URL must use HTTP or HTTPS");
  }

  url.pathname = "/ws";
  url.search = "";
  url.hash = "";

  return url.toString();
};

export function useWebSocket<
  TMessage extends WebSocketMessage = WebSocketMessage,
>(enabled = true) {
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>(
    enabled ? "connecting" : "disconnected",
  );
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef(new Set<MessageListener<TMessage>>());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const sendJsonMessage = useCallback((message: unknown) => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) return false;

    socket.send(JSON.stringify(message));
    return true;
  }, []);

  const subscribeJsonMessage = useCallback(
    (listener: MessageListener<TMessage>) => {
      listenersRef.current.add(listener);

      return () => {
        listenersRef.current.delete(listener);
      };
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      socketRef.current = null;
      setWebsocket(null);
      setStatus("disconnected");
      return;
    }

    let active = true;
    let currentSocket: WebSocket | null = null;

    const clearReconnectTimeout = () => {
      if (!reconnectTimeoutRef.current) return;

      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    };

    const scheduleReconnect = () => {
      if (!active || reconnectTimeoutRef.current) return;

      const delay = Math.min(
        INITIAL_RECONNECT_DELAY_MS * 2 ** reconnectAttemptRef.current,
        MAX_RECONNECT_DELAY_MS,
      );

      reconnectAttemptRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect();
      }, delay);
    };

    const connect = () => {
      clearReconnectTimeout();
      setWebsocket(null);
      setStatus("connecting");

      let socket: WebSocket;
      try {
        socket = new WebSocket(getWebSocketUrl());
      } catch {
        setStatus("error");
        scheduleReconnect();
        return;
      }

      currentSocket = socket;
      socketRef.current = socket;

      socket.onopen = () => {
        if (!active || currentSocket !== socket) return;

        reconnectAttemptRef.current = 0;
        setWebsocket(socket);
        setStatus("connected");
      };

      socket.onmessage = (event) => {
        if (!active || typeof event.data !== "string") return;

        let message: TMessage;
        try {
          message = JSON.parse(event.data) as TMessage;
        } catch {
          return;
        }

        for (const listener of listenersRef.current) {
          listener(message);
        }
      };

      socket.onerror = () => {
        if (!active || currentSocket !== socket) return;

        setStatus("error");
        socket.close();
      };

      socket.onclose = () => {
        if (!active || currentSocket !== socket) return;

        currentSocket = null;
        socketRef.current = null;
        setWebsocket(null);
        setStatus("disconnected");
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      active = false;
      clearReconnectTimeout();
      reconnectAttemptRef.current = 0;
      socketRef.current = null;
      currentSocket?.close(1000, "WebSocket hook unmounted");
    };
  }, [enabled]);

  return {
    websocket,
    status,
    isConnected: status === "connected",
    sendJsonMessage,
    subscribeJsonMessage,
  };
}
