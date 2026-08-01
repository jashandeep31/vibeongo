"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Square,
} from "lucide-react";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  useWebSocketContext,
  type WebSocketToolMessageData,
} from "@/hooks/use-websocket";

interface T3CodeCardProps {
  domainFor3773: string | null;
  isTerminated: boolean;
}

type ToolStatus = "stopped" | "starting" | "started" | "stopping";
type PendingToolAction = "start" | "restart" | "stop" | null;
type TokenAction = "open" | "external" | "copy";

const TOOL = "codex";

export function T3CodeCard({ domainFor3773, isTerminated }: T3CodeCardProps) {
  const { websocket, sendJsonMessage, subscribeJsonMessage } =
    useWebSocketContext();
  const [status, setStatus] = useState<ToolStatus>("stopped");
  const [pendingToolAction, setPendingToolAction] =
    useState<PendingToolAction>(null);
  const [pendingTokenAction, setPendingTokenAction] =
    useState<TokenAction | null>(null);
  const [isTokenCopied, setIsTokenCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenActionRef = useRef<TokenAction | null>(null);
  const requestTokenAfterStartRef = useRef(false);
  const copyResetTimerRef = useRef<number | null>(null);

  const toolUrl = domainFor3773 ? `https://${domainFor3773}` : null;
  const canSendAction = websocket?.readyState === WebSocket.OPEN;
  const isRunning = status === "started";
  const isStarting = status === "starting";
  const isStopping = status === "stopping";

  const sendToolAction = useCallback(
    (action: "start" | "restart" | "stop" | "password" | "status") => {
      sendJsonMessage({
        type: "tool",
        data: { tool: TOOL, action },
      });
    },
    [sendJsonMessage],
  );

  const runTokenAction = useCallback(
    (action: TokenAction, token: string) => {
      if (!toolUrl) {
        return;
      }

      if (action === "copy") {
        void navigator.clipboard.writeText(token).then(() => {
          setIsTokenCopied(true);
          if (copyResetTimerRef.current) {
            window.clearTimeout(copyResetTimerRef.current);
          }
          copyResetTimerRef.current = window.setTimeout(
            () => setIsTokenCopied(false),
            1800,
          );
        });
        return;
      }

      const pairUrl =
        action === "external"
          ? `https://app.t3.codes/pair?host=${encodeURIComponent(`${toolUrl}/`)}#token=${encodeURIComponent(token)}`
          : `${toolUrl}/pair#token=${encodeURIComponent(token)}`;

      window.open(pairUrl, "_blank", "noopener,noreferrer");
    },
    [toolUrl],
  );

  const requestToken = useCallback(
    (action: TokenAction) => {
      tokenActionRef.current = action;
      setPendingTokenAction(action);
      setError(null);
      sendToolAction("password");
    },
    [sendToolAction],
  );

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!websocket) {
      return;
    }

    return subscribeJsonMessage((parsed) => {
      if (
        parsed.type !== "tool" ||
        !parsed.data ||
        typeof parsed.data !== "object"
      ) {
        return;
      }

      const data = parsed.data as WebSocketToolMessageData;
      if (data.tool !== TOOL || typeof data.status !== "boolean") {
        return;
      }

      const nextStatus: ToolStatus = data.status ? "started" : "stopped";
      const nextError = typeof data.error === "string" ? data.error : null;
      const token =
        typeof data.password === "string" && data.password.trim()
          ? data.password
          : null;

      setStatus(nextStatus);
      setPendingToolAction(null);
      setError(nextError);

      if (token && tokenActionRef.current) {
        const action = tokenActionRef.current;
        tokenActionRef.current = null;
        requestTokenAfterStartRef.current = false;
        setPendingTokenAction(null);
        runTokenAction(action, token);
      } else if (
        !nextError &&
        nextStatus === "started" &&
        requestTokenAfterStartRef.current
      ) {
        requestTokenAfterStartRef.current = false;
        sendToolAction("password");
      } else {
        setPendingTokenAction(null);
      }

      if (nextStatus === "stopped" || nextError) {
        tokenActionRef.current = null;
        requestTokenAfterStartRef.current = false;
        setPendingTokenAction(null);
      }
    });
  }, [runTokenAction, sendToolAction, subscribeJsonMessage, websocket]);

  useEffect(() => {
    if (!websocket || !toolUrl || isTerminated) {
      return;
    }
    sendToolAction("status");
  }, [isTerminated, sendToolAction, toolUrl, websocket]);

  useEffect(() => {
    if (!isTerminated) {
      return;
    }
    setStatus("stopped");
    setPendingToolAction(null);
    setPendingTokenAction(null);
    setError(null);
    tokenActionRef.current = null;
    requestTokenAfterStartRef.current = false;
  }, [isTerminated]);

  const startForTokenAction = (action: TokenAction) => {
    if (!toolUrl || !canSendAction) {
      return;
    }

    tokenActionRef.current = action;
    setPendingTokenAction(action);
    setError(null);

    if (isRunning) {
      sendToolAction("password");
      return;
    }

    setStatus("starting");
    setPendingToolAction("start");
    requestTokenAfterStartRef.current = true;
    sendToolAction("start");
  };

  const handleRestart = () => {
    if (!canSendAction) {
      return;
    }
    setStatus("starting");
    setPendingToolAction("restart");
    setError(null);
    tokenActionRef.current = "open";
    setPendingTokenAction("open");
    requestTokenAfterStartRef.current = true;
    sendToolAction("restart");
  };

  const handleStop = () => {
    if (!canSendAction) {
      return;
    }
    setStatus("stopping");
    setPendingToolAction("stop");
    setPendingTokenAction(null);
    setError(null);
    tokenActionRef.current = null;
    requestTokenAfterStartRef.current = false;
    sendToolAction("stop");
  };

  const primaryLabel = isStopping
    ? "Stopping..."
    : pendingTokenAction === "open"
      ? "Opening..."
      : pendingToolAction === "start"
        ? "Starting..."
        : isRunning
          ? "Open"
          : "Start";

  return (
    <section>
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight">
              T3 Code
            </h2>
            <span
              aria-label={isRunning ? "Running" : "Stopped"}
              title={isRunning ? "Running" : "Stopped"}
              className={
                isRunning
                  ? "h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"
                  : "h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"
              }
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              type="button"
              disabled={
                isTerminated ||
                Boolean(pendingTokenAction) ||
                isStopping ||
                !toolUrl ||
                !canSendAction
              }
              aria-label={isRunning ? "Open T3 Code" : "Start T3 Code"}
              title={isRunning ? "Open T3 Code" : "Start T3 Code"}
              className="min-w-20"
              onClick={() => startForTokenAction("open")}
            >
              {pendingTokenAction === "open" || isStopping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              <span>{primaryLabel}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="outline"
                  type="button"
                  disabled={isTerminated}
                  aria-label="T3 Code actions"
                  title="T3 Code actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  disabled={isStarting || isStopping || !canSendAction}
                  onSelect={handleRestart}
                >
                  {pendingToolAction === "restart" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Restart
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={
                    isStopping ||
                    !canSendAction ||
                    (status !== "started" && status !== "starting")
                  }
                  onSelect={handleStop}
                >
                  <Square className="h-4 w-4" />
                  Stop
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!isRunning || Boolean(pendingTokenAction)}
                  onSelect={() => requestToken("copy")}
                >
                  {pendingTokenAction === "copy" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isTokenCopied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Get pairing token
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={
                    !toolUrl || Boolean(pendingTokenAction) || !canSendAction
                  }
                  onSelect={() => startForTokenAction("external")}
                >
                  {pendingTokenAction === "external" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Open in T3 Code
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {error ? (
          <p className="text-destructive mt-2 text-xs break-words">{error}</p>
        ) : null}
      </div>
    </section>
  );
}
