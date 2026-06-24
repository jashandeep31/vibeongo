"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type WebSocketContextValue = {
  websocket: WebSocket | null;
  sendJsonMessage: (message: WebSocketClientMessage) => void;
};

export type WebSocketClientMessage =
  | {
      type: "terminal";
      data: string;
    }
  | {
      type: "size";
      data: {
        rows: number;
        cols: number;
      };
    }
  | {
      type: "switchSession" | "endSession";
      data: {
        sessionId: string;
      };
    }
  | {
      type: "newSession";
    }
  | {
      type: "opencode";
      data: {
        action: "status" | "start" | "restart" | "stop";
      };
    };

type WebSocketMessageHandlers = {
  onSessionIds?: (ids: string[], activeId: string | null) => void;
  onPtyUpdate?: (sessionId: string | null, hasBuffer: boolean) => void;
};

const SocketContext = createContext<WebSocketContextValue | null>(null);

const parseJsonMessageStream = (data: string) => {
  try {
    return [JSON.parse(data)];
  } catch {
    // Some websocket servers/proxies may coalesce text JSON frames. Keep
    // typed envelopes out of the terminal instead of writing them as PTY text.
  }

  const messages: unknown[] = [];
  let depth = 0;
  let start = -1;
  let isInString = false;
  let isEscaped = false;

  for (let index = 0; index < data.length; index += 1) {
    const char = data.charAt(index);

    if (isInString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === '"') {
        isInString = false;
      }
      continue;
    }

    if (depth === 0 && /\S/.test(char) && char !== "{") {
      return null;
    }

    if (char === '"') {
      isInString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        try {
          messages.push(JSON.parse(data.slice(start, index + 1)));
        } catch {
          return null;
        }
        start = -1;
      }

      if (depth < 0) {
        return null;
      }
    }
  }

  return messages.length > 0 && depth === 0 ? messages : null;
};

export const parseWebSocketJsonMessages = (data: string) => {
  const messages = parseJsonMessageStream(data);
  if (!messages) return null;

  const hasWebSocketEnvelope = messages.some(
    (message) => !!message && typeof message === "object" && "type" in message,
  );

  return hasWebSocketEnvelope ? messages : null;
};

export const handleWebSocketJsonMessage = (
  parsed: unknown,
  handlers: WebSocketMessageHandlers = {},
) => {
  if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
    return false;
  }

  const message = parsed as {
    type?: unknown;
    data?: unknown;
    ids?: unknown;
    activeId?: unknown;
    sessionId?: unknown;
    hasBuffer?: unknown;
  };

  if (message.type === "stats") {
    window.dispatchEvent(
      new CustomEvent("vps-stats", { detail: message.data }),
    );
    return true;
  }

  if (message.type === "logs") {
    window.dispatchEvent(new CustomEvent("vps-logs", { detail: message.data }));
    return true;
  }

  if (message.type === "opencode") {
    return true;
  }

  if (message.type === "sessionIds") {
    if (Array.isArray(message.ids)) {
      handlers.onSessionIds?.(
        message.ids.filter((id): id is string => typeof id === "string"),
        typeof message.activeId === "string" ? message.activeId : null,
      );
    } else {
      console.log("Parsed ids are not here , Error in the  backend server");
    }
    return true;
  }

  if (message.type === "ptyUpdate") {
    handlers.onPtyUpdate?.(
      typeof message.sessionId === "string" ? message.sessionId : null,
      message.hasBuffer === true,
    );
    return true;
  }

  return false;
};

export const WebSocketProvider = ({
  children,
  socketUrl,
}: {
  children: ReactNode;
  socketUrl: string | undefined | null;
}) => {
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);

  const sendJsonMessage = useCallback(
    (message: WebSocketClientMessage) => {
      if (websocket?.readyState !== WebSocket.OPEN) return;
      websocket.send(JSON.stringify(message));
    },
    [websocket],
  );

  useEffect(() => {
    setWebsocket(null);
    if (!socketUrl) {
      return;
    }

    const ws = new WebSocket(`wss://${socketUrl}/ws`);

    ws.onopen = () => {
      setWebsocket(ws);
    };

    ws.onclose = () => {
      setWebsocket((current) => (current === ws ? null : current));
    };

    return () => {
      setWebsocket((current) => (current === ws ? null : current));
      ws.close();
    };
  }, [socketUrl]);

  return (
    <SocketContext.Provider value={{ websocket, sendJsonMessage }}>
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
