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
type PasswordPendingAction = "copy" | "open" | null;
type ToolAction = "start" | "restart" | "stop" | "password";

interface ToolWebCardProps {
  title: string;
  tool: string;
  url: string | null;
  isTerminated: boolean;
  password?: string | null;
  passwordLabel?: string;
  canRequestPassword?: boolean;
}

export function ToolWebCard({
  title,
  tool,
  url,
  isTerminated,
  password,
  passwordLabel = "password",
  canRequestPassword = false,
}: ToolWebCardProps) {
  const { websocket, sendJsonMessage, subscribeJsonMessage } =
    useWebSocketContext();
  const [status, setStatus] = useState<ToolStatus>("stopped");
  const [pendingAction, setPendingAction] = useState<ToolPendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordPendingAction, setPasswordPendingAction] =
    useState<PasswordPendingAction>(null);
  const [isPasswordCopied, setIsPasswordCopied] = useState(false);
  const copyResetTimerRef = useRef<number | null>(null);
  const shouldCopyPasswordOnReceiveRef = useRef(false);
  const shouldOpenPairOnPasswordReceiveRef = useRef(false);
  const shouldRequestPasswordOnStartedRef = useRef(false);
  const shouldRedirectOnStartedRef = useRef(false);

  const isRunning = status === "started";
  const isStarting = status === "starting";
  const isStopping = status === "stopping";
  const isStartPending = isStarting && pendingAction === "start";
  const isRestartPending = isStarting && pendingAction === "restart";
  const canSendAction = websocket?.readyState === WebSocket.OPEN;
  const passwordValue = password ?? null;
  const hasPassword = Boolean(passwordValue);
  const isPasswordPending = passwordPendingAction !== null;
  const canShowPasswordAction = hasPassword || canRequestPassword;

  const redirectToTool = useCallback(() => {
    if (!url) {
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }, [url]);

  const redirectToPair = useCallback(
    (token: string) => {
      if (!url) {
        return;
      }

      const pairUrl = `${url.replace(/\/$/, "")}/pair#token=${encodeURIComponent(token)}`;
      window.open(pairUrl, "_blank", "noopener,noreferrer");
    },
    [url],
  );

  const sendToolAction = useCallback(
    (action: ToolAction) => {
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

  const copyPassword = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
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
  }, []);

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
      setPasswordPendingAction(null);
      shouldRedirectOnStartedRef.current = false;
      shouldCopyPasswordOnReceiveRef.current = false;
      shouldOpenPairOnPasswordReceiveRef.current = false;
      shouldRequestPasswordOnStartedRef.current = false;
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
      const nextPassword =
        typeof data.password === "string" && data.password.trim()
          ? data.password
          : null;

      setStatus(nextStatus);
      setPendingAction(null);
      setError(nextError);
      setPasswordPendingAction(null);

      if (nextPassword && shouldOpenPairOnPasswordReceiveRef.current) {
        shouldOpenPairOnPasswordReceiveRef.current = false;
        redirectToPair(nextPassword);
      }

      if (nextPassword && shouldCopyPasswordOnReceiveRef.current) {
        shouldCopyPasswordOnReceiveRef.current = false;
        void copyPassword(nextPassword);
      }

      if (
        !nextError &&
        nextStatus === "started" &&
        shouldRequestPasswordOnStartedRef.current
      ) {
        shouldRequestPasswordOnStartedRef.current = false;
        setPasswordPendingAction("open");
        shouldOpenPairOnPasswordReceiveRef.current = true;
        sendToolAction("password");
        return;
      }

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
        shouldCopyPasswordOnReceiveRef.current = false;
        shouldOpenPairOnPasswordReceiveRef.current = false;
        shouldRequestPasswordOnStartedRef.current = false;
      }
    });

    return () => {
      unsubscribeMessages();
    };
  }, [
    copyPassword,
    redirectToPair,
    redirectToTool,
    sendToolAction,
    subscribeJsonMessage,
    tool,
    websocket,
  ]);

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
      if (canRequestPassword) {
        if (!canSendAction) {
          return;
        }

        setPasswordPendingAction("open");
        setError(null);
        shouldOpenPairOnPasswordReceiveRef.current = true;
        sendToolAction("password");
        return;
      }

      redirectToTool();
      return;
    }

    if (!canSendAction) {
      return;
    }

    setStatus("starting");
    setPendingAction("start");
    setError(null);
    if (canRequestPassword) {
      setPasswordPendingAction("open");
      shouldRequestPasswordOnStartedRef.current = true;
    } else {
      shouldRedirectOnStartedRef.current = true;
    }
    sendToolAction("start");
  };

  const handleStop = () => {
    if (!canSendAction) {
      return;
    }

    setStatus("stopping");
    setPendingAction("stop");
    setError(null);
    setPasswordPendingAction(null);
    shouldRedirectOnStartedRef.current = false;
    shouldCopyPasswordOnReceiveRef.current = false;
    shouldOpenPairOnPasswordReceiveRef.current = false;
    shouldRequestPasswordOnStartedRef.current = false;
    sendToolAction("stop");
  };

  const handleRestart = () => {
    if (!canSendAction) {
      return;
    }

    setStatus("starting");
    setPendingAction("restart");
    setError(null);
    if (canRequestPassword) {
      setPasswordPendingAction("open");
      shouldRequestPasswordOnStartedRef.current = true;
    } else {
      shouldRedirectOnStartedRef.current = true;
    }
    sendToolAction("restart");
  };

  const handleCopyPassword = async () => {
    if (passwordValue) {
      await copyPassword(passwordValue);
      return;
    }

    if (!canRequestPassword || !canSendAction) {
      return;
    }

    setPasswordPendingAction("copy");
    setError(null);
    shouldCopyPasswordOnReceiveRef.current = true;
    sendToolAction("password");
  };

  const primaryLabel = isStopping
    ? "Stopping..."
    : passwordPendingAction === "open"
      ? "Opening..."
    : isStartPending
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
                isPasswordPending ||
                isStopping ||
                !url ||
                (canRequestPassword && !canSendAction) ||
                (status === "stopped" && !canSendAction)
              }
              aria-label={isRunning ? `Open ${title}` : `Start ${title}`}
              title={isRunning ? `Open ${title}` : `Start ${title}`}
              className="min-w-20"
              onClick={handlePrimaryAction}
            >
              {isStartPending || isPasswordPending || isStopping ? (
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

                {canShowPasswordAction ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={
                        isPasswordPending || (!hasPassword && !canSendAction)
                      }
                      onSelect={(event) => {
                        event.preventDefault();
                        void handleCopyPassword();
                      }}
                    >
                      {isPasswordPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isPasswordCopied ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {hasPassword ? "Copy" : "Get"} {passwordLabel}
                    </DropdownMenuItem>
                  </>
                ) : null}
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
