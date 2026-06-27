"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Loader2, RotateCcw, Square } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import {
  useWebSocketContext,
  type WebSocketToolMessageData,
} from "@/hooks/use-websocket";

interface T3CodeCardProps {
  domainFor3773: string | null;
  isTerminated: boolean;
}

type T3CodeStatus = "stopped" | "starting" | "started" | "stopping";
type T3CodePendingAction = "start" | "restart" | "stop" | null;

export function T3CodeCard({ domainFor3773, isTerminated }: T3CodeCardProps) {
  const { websocket, sendJsonMessage, subscribeJsonMessage } =
    useWebSocketContext();
  const [t3CodeStatus, setT3CodeStatus] = useState<T3CodeStatus>("stopped");
  const [pendingT3CodeAction, setPendingT3CodeAction] =
    useState<T3CodePendingAction>(null);
  const [t3CodeError, setT3CodeError] = useState<string | null>(null);
  const shouldRedirectOnStartedRef = useRef(false);

  const t3CodeUrl = domainFor3773 ? `https://${domainFor3773}` : null;
  const isT3CodeConnected = t3CodeStatus === "started";
  const isOpeningT3Code = t3CodeStatus === "starting";
  const isStoppingT3Code = t3CodeStatus === "stopping";
  const isStartingT3Code =
    isOpeningT3Code && pendingT3CodeAction === "start";
  const isRestartingT3Code =
    isOpeningT3Code && pendingT3CodeAction === "restart";
  const canSendT3CodeAction = websocket?.readyState === WebSocket.OPEN;

  const redirectToT3Code = useCallback(() => {
    if (!t3CodeUrl) {
      return;
    }

    window.open(t3CodeUrl, "_blank", "noopener,noreferrer");
  }, [t3CodeUrl]);

  useEffect(() => {
    if (!t3CodeUrl || isTerminated) {
      setT3CodeStatus("stopped");
      setPendingT3CodeAction(null);
      setT3CodeError(null);
    }
  }, [isTerminated, t3CodeUrl]);

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

      if (data.tool !== "codex" || typeof data.status !== "boolean") {
        return;
      }

      const error = typeof data.error === "string" ? data.error : null;
      const nextStatus: T3CodeStatus = data.status ? "started" : "stopped";

      setT3CodeStatus(nextStatus);
      setPendingT3CodeAction(null);
      setT3CodeError(error);

      if (
        !error &&
        nextStatus === "started" &&
        shouldRedirectOnStartedRef.current
      ) {
        shouldRedirectOnStartedRef.current = false;
        redirectToT3Code();
      }

      if (nextStatus === "stopped" || error) {
        shouldRedirectOnStartedRef.current = false;
      }
    });

    return () => {
      unsubscribeMessages();
    };
  }, [redirectToT3Code, subscribeJsonMessage, websocket]);

  useEffect(() => {
    if (!websocket || !t3CodeUrl || isTerminated) {
      return;
    }

    sendJsonMessage({
      type: "tool",
      data: {
        tool: "codex",
        action: "status",
      },
    });
  }, [isTerminated, sendJsonMessage, t3CodeUrl, websocket]);

  const handleOpenT3Code = async () => {
    if (!t3CodeUrl) {
      return;
    }

    if (t3CodeStatus === "started" || t3CodeStatus === "starting") {
      redirectToT3Code();
      return;
    }

    if (!canSendT3CodeAction) {
      return;
    }

    setT3CodeStatus("starting");
    setPendingT3CodeAction("start");
    setT3CodeError(null);
    shouldRedirectOnStartedRef.current = true;
    sendJsonMessage({
      type: "tool",
      data: {
        tool: "codex",
        action: "start",
      },
    });
  };

  const handleStopT3Code = async () => {
    if (!canSendT3CodeAction) {
      return;
    }

    setT3CodeStatus("stopping");
    setPendingT3CodeAction("stop");
    setT3CodeError(null);
    shouldRedirectOnStartedRef.current = false;
    sendJsonMessage({
      type: "tool",
      data: {
        tool: "codex",
        action: "stop",
      },
    });
  };

  const handleRestartT3Code = async () => {
    if (!canSendT3CodeAction) {
      return;
    }

    setT3CodeStatus("starting");
    setPendingT3CodeAction("restart");
    setT3CodeError(null);
    shouldRedirectOnStartedRef.current = true;
    sendJsonMessage({
      type: "tool",
      data: {
        tool: "codex",
        action: "restart",
      },
    });
  };

  return (
    <section>
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight">T3 Code</h2>
          <span
            aria-label={isT3CodeConnected ? "Running" : "Stopped"}
            title={isT3CodeConnected ? "Running" : "Stopped"}
            className={
              isT3CodeConnected
                ? "h-2.5 w-2.5 rounded-full bg-emerald-500"
                : "h-2.5 w-2.5 rounded-full bg-red-500"
            }
          />
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <Button
            size="icon-sm"
            variant="outline"
            type="button"
            disabled={
              isTerminated ||
              isStoppingT3Code ||
              !t3CodeUrl ||
              (t3CodeStatus === "stopped" && !canSendT3CodeAction)
            }
            aria-label={isT3CodeConnected ? "Open T3 Code" : "Start T3 Code"}
            title={isT3CodeConnected ? "Open T3 Code" : "Start T3 Code"}
            className="sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5"
            onClick={() => {
              void handleOpenT3Code();
            }}
          >
            {isStartingT3Code ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="sr-only sm:not-sr-only">Starting...</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">
                  {isT3CodeConnected ? "Open Web" : "Start Web"}
                </span>
              </>
            )}
          </Button>

          <Button
            size="icon-sm"
            variant="outline"
            type="button"
            disabled={
              isTerminated ||
              isOpeningT3Code ||
              isStoppingT3Code ||
              !canSendT3CodeAction
            }
            aria-label="Restart T3 Code"
            title="Restart T3 Code"
            className="sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5"
            onClick={() => {
              void handleRestartT3Code();
            }}
          >
            {isRestartingT3Code ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="sr-only sm:not-sr-only">Restarting...</span>
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Restart</span>
              </>
            )}
          </Button>

          <Button
            size="icon-sm"
            variant="outline"
            type="button"
            disabled={
              isTerminated ||
              isStoppingT3Code ||
              !canSendT3CodeAction ||
              (t3CodeStatus !== "started" && t3CodeStatus !== "starting")
            }
            aria-label="Stop T3 Code"
            title="Stop T3 Code"
            className="sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5"
            onClick={() => {
              void handleStopT3Code();
            }}
          >
            {isStoppingT3Code ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="sr-only sm:not-sr-only">Stopping...</span>
              </>
            ) : (
              <>
                <Square className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Stop</span>
              </>
            )}
          </Button>
        </div>

        {t3CodeError ? (
          <p className="mt-2 break-words text-xs text-destructive">
            {t3CodeError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
