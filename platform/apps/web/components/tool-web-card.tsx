"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
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

type ToolStatus = "stopped" | "starting" | "started" | "stopping";
type ToolPendingAction = "start" | "restart" | "stop" | null;

interface ToolWebCardProps {
  title: string;
  tool: string;
  url: string | null;
  isTerminated: boolean;
  password?: string | null;
  passwordLabel?: string;
}

export function ToolWebCard({
  title,
  tool,
  url,
  isTerminated,
  password,
  passwordLabel = "password",
}: ToolWebCardProps) {
  const { websocket, sendJsonMessage, subscribeJsonMessage } =
    useWebSocketContext();
  const [status, setStatus] = useState<ToolStatus>("stopped");
  const [pendingAction, setPendingAction] = useState<ToolPendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordCopied, setIsPasswordCopied] = useState(false);
  const copyResetTimerRef = useRef<number | null>(null);
  const shouldRedirectOnStartedRef = useRef(false);

  const isRunning = status === "started";
  const isStarting = status === "starting";
  const isStopping = status === "stopping";
  const isStartPending = isStarting && pendingAction === "start";
  const isRestartPending = isStarting && pendingAction === "restart";
  const canSendAction = websocket?.readyState === WebSocket.OPEN;
  const hasPassword = Boolean(password);

  const redirectToTool = useCallback(() => {
    if (!url) {
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }, [url]);

  const sendToolAction = useCallback(
    (action: "start" | "restart" | "stop") => {
      sendJsonMessage({
        type: "tool",
        data: {
          tool,
          action,
        },
      });
    },
    [sendJsonMessage, tool],
  );

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!url || isTerminated) {
      setStatus("stopped");
      setPendingAction(null);
      setError(null);
    }
  }, [isTerminated, url]);

  useEffect(() => {
    if (!websocket) {
      return;
    }

    const unsubscribeMessages = subscribeJsonMessage((parsed) => {
      if (parsed.type !== "tool") {
        return;
      }

      if (!parsed.data || typeof parsed.data !== "object") {
        return;
      }

      const data = parsed.data as WebSocketToolMessageData;

      if (data.tool !== tool || typeof data.status !== "boolean") {
        return;
      }

      const nextError = typeof data.error === "string" ? data.error : null;
      const nextStatus: ToolStatus = data.status ? "started" : "stopped";

      setStatus(nextStatus);
      setPendingAction(null);
      setError(nextError);

      if (
        !nextError &&
        nextStatus === "started" &&
        shouldRedirectOnStartedRef.current
      ) {
        shouldRedirectOnStartedRef.current = false;
        redirectToTool();
      }

      if (nextStatus === "stopped" || nextError) {
        shouldRedirectOnStartedRef.current = false;
      }
    });

    return () => {
      unsubscribeMessages();
    };
  }, [redirectToTool, subscribeJsonMessage, tool, websocket]);

  useEffect(() => {
    if (!websocket || !url || isTerminated) {
      return;
    }

    sendJsonMessage({
      type: "tool",
      data: {
        tool,
        action: "status",
      },
    });
  }, [isTerminated, sendJsonMessage, tool, url, websocket]);

  const handlePrimaryAction = () => {
    if (!url) {
      return;
    }

    if (status === "started" || status === "starting") {
      redirectToTool();
      return;
    }

    if (!canSendAction) {
      return;
    }

    setStatus("starting");
    setPendingAction("start");
    setError(null);
    shouldRedirectOnStartedRef.current = true;
    sendToolAction("start");
  };

  const handleStop = () => {
    if (!canSendAction) {
      return;
    }

    setStatus("stopping");
    setPendingAction("stop");
    setError(null);
    shouldRedirectOnStartedRef.current = false;
    sendToolAction("stop");
  };

  const handleRestart = () => {
    if (!canSendAction) {
      return;
    }

    setStatus("starting");
    setPendingAction("restart");
    setError(null);
    shouldRedirectOnStartedRef.current = true;
    sendToolAction("restart");
  };

  const handleCopyPassword = async () => {
    if (!password) {
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      setIsPasswordCopied(true);

      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      copyResetTimerRef.current = window.setTimeout(() => {
        setIsPasswordCopied(false);
      }, 1800);
    } catch {
      setIsPasswordCopied(false);
    }
  };

  const primaryLabel = isStopping
    ? "Stopping..."
    : isStartPending
      ? "Starting..."
      : isRunning
        ? "Open"
        : "Start";

  return (
    <section>
      <div className="rounded-lg bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight">
              {title}
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
                isStopping ||
                !url ||
                (status === "stopped" && !canSendAction)
              }
              aria-label={isRunning ? `Open ${title}` : `Start ${title}`}
              title={isRunning ? `Open ${title}` : `Start ${title}`}
              className="min-w-20"
              onClick={handlePrimaryAction}
            >
              {isStartPending || isStopping ? (
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
                  aria-label={`${title} actions`}
                  title={`${title} actions`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  disabled={isStarting || isStopping || !canSendAction}
                  onSelect={handleRestart}
                >
                  {isRestartPending ? (
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

                {hasPassword ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        void handleCopyPassword();
                      }}
                    >
                      {isPasswordCopied ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Copy {passwordLabel}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {error ? (
          <p className="mt-2 break-words text-xs text-destructive">{error}</p>
        ) : null}
      </div>
    </section>
  );
}
