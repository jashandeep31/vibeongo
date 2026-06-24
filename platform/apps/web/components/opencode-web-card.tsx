"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Globe, RotateCcw, Square } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { useWebSocketContext } from "@/hooks/use-websocket";

interface OpencodeWebCardProps {
  domainFor8080: string | null;
  domainFor4096: string | null;
  isTerminated: boolean;
  opencodePassword?: string | null;
}

type OpencodeWebStatus = "stopped" | "starting" | "started" | "stopping";
type OpencodeWebPendingAction = "start" | "restart" | "stop" | null;

export function OpencodeWebCard({
  domainFor4096,
  isTerminated,
  opencodePassword,
}: OpencodeWebCardProps) {
  const { websocket, sendJsonMessage } = useWebSocketContext();
  const [opencodeWebStatus, setOpencodeWebStatus] =
    useState<OpencodeWebStatus>("stopped");
  const [pendingOpencodeWebAction, setPendingOpencodeWebAction] =
    useState<OpencodeWebPendingAction>(null);
  const [isOpencodePasswordCopied, setIsOpencodePasswordCopied] =
    useState(false);
  const copyResetTimerRef = useRef<number | null>(null);
  const shouldRedirectOnStartedRef = useRef(false);

  const opencodeWebUrl = domainFor4096 ? `https://${domainFor4096}` : null;
  const isOpenCodeConnected = opencodeWebStatus === "started";
  const isOpeningOpenCodeWeb = opencodeWebStatus === "starting";
  const isStoppingOpenCodeWeb = opencodeWebStatus === "stopping";
  const isStartingOpenCodeWeb =
    isOpeningOpenCodeWeb && pendingOpencodeWebAction === "start";
  const isRestartingOpenCodeWeb =
    isOpeningOpenCodeWeb && pendingOpencodeWebAction === "restart";
  const canSendOpencodeAction = websocket?.readyState === WebSocket.OPEN;

  const redirectToOpencodeWeb = useCallback(() => {
    if (!opencodeWebUrl) {
      return;
    }

    window.open(opencodeWebUrl, "_blank", "noopener,noreferrer");
  }, [opencodeWebUrl]);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!opencodeWebUrl || isTerminated) {
      setOpencodeWebStatus("stopped");
      setPendingOpencodeWebAction(null);
    }
  }, [isTerminated, opencodeWebUrl]);

  useEffect(() => {
    if (!websocket) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") {
        return;
      }

      try {
        const parsed = JSON.parse(event.data) as {
          type?: unknown;
          data?: unknown;
        };

        if (parsed.type !== "opencode") {
          return;
        }

        const data = parsed.data as { state?: unknown; error?: unknown };

        if (data.state !== "started" && data.state !== "stopped") {
          return;
        }

        setOpencodeWebStatus(data.state);
        setPendingOpencodeWebAction(null);

        if (
          data.state === "started" &&
          !data.error &&
          shouldRedirectOnStartedRef.current
        ) {
          shouldRedirectOnStartedRef.current = false;
          redirectToOpencodeWeb();
        }

        if (data.state === "stopped") {
          shouldRedirectOnStartedRef.current = false;
        }
      } catch {
        // Ignore non-JSON websocket payloads.
      }
    };

    websocket.addEventListener("message", handleMessage);

    return () => {
      websocket.removeEventListener("message", handleMessage);
    };
  }, [redirectToOpencodeWeb, websocket]);

  const handleOpenOpenCodeWeb = async () => {
    if (!opencodeWebUrl) {
      return;
    }

    if (opencodeWebStatus === "started" || opencodeWebStatus === "starting") {
      redirectToOpencodeWeb();
      return;
    }

    if (!canSendOpencodeAction) {
      return;
    }

    setOpencodeWebStatus("starting");
    setPendingOpencodeWebAction("start");
    shouldRedirectOnStartedRef.current = true;
    sendJsonMessage({
      type: "opencode",
      data: {
        action: "start",
      },
    });
  };

  const handleStopOpenCodeWeb = async () => {
    if (!canSendOpencodeAction) {
      return;
    }

    setOpencodeWebStatus("stopping");
    setPendingOpencodeWebAction("stop");
    shouldRedirectOnStartedRef.current = false;
    sendJsonMessage({
      type: "opencode",
      data: {
        action: "stop",
      },
    });
  };

  const handleRestartOpenCodeWeb = async () => {
    if (!canSendOpencodeAction) {
      return;
    }

    setOpencodeWebStatus("starting");
    setPendingOpencodeWebAction("restart");
    shouldRedirectOnStartedRef.current = true;
    sendJsonMessage({
      type: "opencode",
      data: {
        action: "restart",
      },
    });
  };

  const handleCopyOpencodePassword = async () => {
    if (!opencodePassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(opencodePassword);
      setIsOpencodePasswordCopied(true);

      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      copyResetTimerRef.current = window.setTimeout(() => {
        setIsOpencodePasswordCopied(false);
      }, 1800);
    } catch {
      setIsOpencodePasswordCopied(false);
    }
  };

  return (
    <section>
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight">
            Opencode Web
          </h2>
          <span
            aria-label={isOpenCodeConnected ? "Running" : "Stopped"}
            title={isOpenCodeConnected ? "Running" : "Stopped"}
            className={
              isOpenCodeConnected
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
              isStoppingOpenCodeWeb ||
              !opencodeWebUrl ||
              (opencodeWebStatus === "stopped" && !canSendOpencodeAction)
            }
            aria-label={
              isOpenCodeConnected ? "Open Opencode" : "Start Opencode"
            }
            title={isOpenCodeConnected ? "Open Opencode" : "Start Opencode"}
            className="sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5"
            onClick={() => {
              void handleOpenOpenCodeWeb();
            }}
          >
            {isStartingOpenCodeWeb ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="sr-only sm:not-sr-only">Starting...</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">
                  {isOpenCodeConnected ? "Open Web" : "Start Web"}
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
              isOpeningOpenCodeWeb ||
              isStoppingOpenCodeWeb ||
              !canSendOpencodeAction
            }
            aria-label="Restart Opencode"
            title="Restart Opencode"
            className="sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5"
            onClick={() => {
              void handleRestartOpenCodeWeb();
            }}
          >
            {isRestartingOpenCodeWeb ? (
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
              isStoppingOpenCodeWeb ||
              !canSendOpencodeAction ||
              (opencodeWebStatus !== "started" &&
                opencodeWebStatus !== "starting")
            }
            aria-label="Stop Opencode"
            title="Stop Opencode"
            className="sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5"
            onClick={() => {
              void handleStopOpenCodeWeb();
            }}
          >
            {isStoppingOpenCodeWeb ? (
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

          <Button
            size="icon-sm"
            variant="outline"
            type="button"
            disabled={!opencodePassword}
            aria-label="Copy Opencode password"
            title="Copy Opencode password"
            className="sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5"
            onClick={() => {
              void handleCopyOpencodePassword();
            }}
          >
            {isOpencodePasswordCopied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="sr-only sm:not-sr-only">Password</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
