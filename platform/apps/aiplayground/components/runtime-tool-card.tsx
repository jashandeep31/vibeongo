"use client";

import type { RuntimeControlMessage } from "@/hooks/use-runtime-control-socket";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  KeyRound,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Square,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ToolStatus = "stopped" | "starting" | "started" | "stopping";
type ToolKind = "opencode" | "codex";
type T3TokenAction = "open" | "copy" | "copy-url" | "external";

export function RuntimeToolCard({
  disabled = false,
  isConnected,
  lastMessage,
  opencodePassword,
  sendJsonMessage,
  tool,
  url,
}: {
  disabled?: boolean;
  isConnected: boolean;
  lastMessage: RuntimeControlMessage | null;
  opencodePassword?: string | null;
  sendJsonMessage: (message: unknown) => boolean;
  tool: ToolKind;
  url: string;
}) {
  const [status, setStatus] = useState<ToolStatus>("stopped");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedAction, setCopiedAction] = useState<
    "password" | "token" | "url" | null
  >(null);
  const tokenActionRef = useRef<T3TokenAction | null>(null);
  const requestTokenAfterStartRef = useRef(false);
  const title = tool === "opencode" ? "OpenCode Web" : "T3 Code";
  const isRunning = status === "started";
  const isBusy = status === "starting" || status === "stopping";

  const sendAction = useCallback(
    (action: "start" | "restart" | "stop" | "password" | "status") =>
      sendJsonMessage({ type: "tool", data: { action, tool } }),
    [sendJsonMessage, tool],
  );

  const openUrl = useCallback((target: string) => {
    window.open(target, "_blank", "noopener,noreferrer");
  }, []);

  const markCopied = (kind: "password" | "token" | "url") => {
    setCopiedAction(kind);
    window.setTimeout(() => setCopiedAction(null), 1_800);
  };

  const runT3TokenAction = useCallback(
    async (action: T3TokenAction, token: string) => {
      const host = url.replace(/\/$/, "");
      const encodedToken = encodeURIComponent(token);
      const localPairUrl = `${host}/pair#token=${encodedToken}`;
      const externalPairUrl = `https://app.t3.codes/pair?host=${encodeURIComponent(`${host}/`)}#token=${encodedToken}`;

      try {
        if (action === "copy") {
          await navigator.clipboard.writeText(token);
          markCopied("token");
          toast.success("Pairing token copied");
        } else if (action === "copy-url") {
          await navigator.clipboard.writeText(localPairUrl);
          markCopied("url");
          toast.success("Pairing URL copied");
        } else {
          openUrl(action === "external" ? externalPairUrl : localPairUrl);
        }
      } catch {
        toast.error("Could not copy pairing details");
      }
    },
    [openUrl, url],
  );

  useEffect(() => {
    if (isConnected) sendAction("status");
  }, [isConnected, sendAction]);

  useEffect(() => {
    if (
      lastMessage?.type !== "tool" ||
      !lastMessage.data ||
      typeof lastMessage.data !== "object" ||
      Array.isArray(lastMessage.data)
    ) {
      return;
    }

    const data = lastMessage.data as Record<string, unknown>;
    if (data.tool !== tool || typeof data.status !== "boolean") return;

    const nextStatus: ToolStatus = data.status ? "started" : "stopped";
    const nextError = typeof data.error === "string" ? data.error : null;
    const token = typeof data.password === "string" ? data.password.trim() : "";
    setStatus(nextStatus);
    setError(nextError);

    if (tool === "codex" && token && tokenActionRef.current) {
      const action = tokenActionRef.current;
      tokenActionRef.current = null;
      requestTokenAfterStartRef.current = false;
      setPendingAction(null);
      void runT3TokenAction(action, token);
    } else if (
      tool === "codex" &&
      !nextError &&
      nextStatus === "started" &&
      requestTokenAfterStartRef.current
    ) {
      requestTokenAfterStartRef.current = false;
      sendAction("password");
    } else if (
      tool === "opencode" &&
      !nextError &&
      nextStatus === "started" &&
      (pendingAction === "start" || pendingAction === "restart")
    ) {
      setPendingAction(null);
      openUrl(url);
    } else {
      setPendingAction(null);
    }

    if (nextStatus === "stopped" || nextError) {
      tokenActionRef.current = null;
      requestTokenAfterStartRef.current = false;
    }
    // Each socket message must be consumed exactly once. Action state changes
    // must not replay the previous tool response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage]);

  const startT3For = (action: T3TokenAction) => {
    if (disabled || !url || !isConnected || isBusy || pendingAction) return;
    tokenActionRef.current = action;
    setPendingAction(action);
    setError(null);
    if (isRunning) {
      sendAction("password");
    } else {
      setStatus("starting");
      requestTokenAfterStartRef.current = true;
      sendAction("start");
    }
  };

  const primaryAction = () => {
    if (tool === "codex") {
      startT3For("open");
    } else if (isRunning) {
      openUrl(url);
    } else if (isConnected) {
      setStatus("starting");
      setPendingAction("start");
      setError(null);
      sendAction("start");
    }
  };

  const restart = () => {
    if (!isConnected || isBusy) return;
    setStatus("starting");
    setPendingAction("restart");
    setError(null);
    if (tool === "codex") {
      tokenActionRef.current = "open";
      requestTokenAfterStartRef.current = true;
    }
    sendAction("restart");
  };

  const stop = () => {
    if (!isConnected || !isRunning) return;
    setStatus("stopping");
    setPendingAction("stop");
    setError(null);
    tokenActionRef.current = null;
    requestTokenAfterStartRef.current = false;
    sendAction("stop");
  };

  const copyPassword = async () => {
    if (!opencodePassword) return;
    try {
      await navigator.clipboard.writeText(opencodePassword);
      markCopied("password");
      toast.success("OpenCode password copied");
    } catch {
      toast.error("Could not copy OpenCode password");
    }
  };

  const primaryLabel = isBusy
    ? status === "stopping"
      ? "Stopping…"
      : "Starting…"
    : pendingAction === "open"
      ? "Opening…"
      : isRunning
        ? "Open"
        : "Start";

  const actionDisabled =
    disabled || !url || !isConnected || isBusy || Boolean(pendingAction);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <span
            className={`size-2 rounded-full ${isRunning ? "bg-emerald-500" : "bg-red-500"}`}
            aria-label={isRunning ? "Running" : "Stopped"}
          />
        </CardTitle>
        <CardDescription>
          {tool === "opencode"
            ? "Run and open the browser interface for OpenCode."
            : "Run T3 Code and connect using a fresh pairing token."}
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={actionDisabled}
            onClick={primaryAction}
          >
            {isBusy || pendingAction ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Globe />
            )}
            {primaryLabel}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                disabled={disabled || !url}
                aria-label={`${title} actions`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                disabled={!isConnected || isBusy}
                onSelect={restart}
              >
                <RotateCcw /> Restart
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!isConnected || !isRunning}
                onSelect={stop}
              >
                <Square /> Stop
              </DropdownMenuItem>
              {tool === "opencode" && opencodePassword ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void copyPassword()}>
                    {copiedAction === "password" ? <Check /> : <Copy />}
                    Copy password
                  </DropdownMenuItem>
                </>
              ) : null}
              {tool === "codex" ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={!isRunning || Boolean(pendingAction)}
                    onSelect={() => startT3For("copy")}
                  >
                    {copiedAction === "token" ? <Check /> : <KeyRound />}
                    Get pairing token
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!isConnected || isBusy || Boolean(pendingAction)}
                    onSelect={() => startT3For("copy-url")}
                  >
                    {copiedAction === "url" ? <Check /> : <Copy />}
                    Copy pairing URL
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!isConnected || isBusy || Boolean(pendingAction)}
                    onSelect={() => startT3For("external")}
                  >
                    <ExternalLink /> Open in T3 Code
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      {error ? (
        <CardContent>
          <p className="text-destructive text-xs break-words">{error}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}
