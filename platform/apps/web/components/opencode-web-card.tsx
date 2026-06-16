"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Globe, Square } from "lucide-react";
import { Button } from "@repo/ui/components/button";

interface OpencodeWebCardProps {
  domainFor8080: string | null;
  domainFor4096: string | null;
  isTerminated: boolean;
  opencodePassword?: string | null;
}

export function OpencodeWebCard({
  domainFor8080,
  domainFor4096,
  isTerminated,
  opencodePassword,
}: OpencodeWebCardProps) {
  const [isOpeningOpenCodeWeb, setIsOpeningOpenCodeWeb] = useState(false);
  const [isStoppingOpenCodeWeb, setIsStoppingOpenCodeWeb] = useState(false);
  const [isOpenCodeConnected, setIsOpenCodeConnected] = useState(false);
  const [isOpencodePasswordCopied, setIsOpencodePasswordCopied] =
    useState(false);
  const copyResetTimerRef = useRef<number | null>(null);

  const opencodeApiUrl = domainFor8080
    ? `https://${domainFor8080}/opencode/web`
    : null;
  const opencodeStatusApiUrl = domainFor8080
    ? `https://${domainFor8080}/opencode/web/status`
    : null;
  const opencodeWebUrl = domainFor4096 ? `https://${domainFor4096}` : null;

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const getOpenCodeStatus = useCallback(async (): Promise<{
    running: boolean;
  }> => {
    if (!opencodeStatusApiUrl) {
      throw new Error("Instance domain not available");
    }

    const response = await fetch(opencodeStatusApiUrl, {
      method: "GET",
    });
    const data = (await response.json()) as {
      message?: string;
      running?: boolean;
    };

    if (!response.ok) {
      throw new Error(data.message || "Failed to check Opencode status");
    }

    return { running: !!data.running };
  }, [opencodeStatusApiUrl]);

  useEffect(() => {
    if (!opencodeStatusApiUrl || isTerminated) {
      setIsOpenCodeConnected(false);
      return;
    }

    let isDisposed = false;

    const syncOpenCodeStatus = async () => {
      try {
        const status = await getOpenCodeStatus();
        if (!isDisposed) {
          setIsOpenCodeConnected(status.running);
        }
      } catch {
        if (!isDisposed) {
          setIsOpenCodeConnected(false);
        }
      }
    };

    void syncOpenCodeStatus();
    const intervalId = window.setInterval(() => {
      void syncOpenCodeStatus();
    }, 10000);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
    };
  }, [getOpenCodeStatus, isTerminated, opencodeStatusApiUrl]);

  const startOpenCodeWeb = async (): Promise<void> => {
    if (!opencodeApiUrl) {
      throw new Error("Instance domain not available");
    }

    const response = await fetch(opencodeApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "start" }),
    });

    const data = (await response.json()) as {
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message || "Failed to start Opencode web");
    }
  };

  const stopOpenCodeWeb = async (): Promise<void> => {
    if (!opencodeApiUrl) {
      throw new Error("Instance domain not available");
    }

    const response = await fetch(opencodeApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "terminate" }),
    });

    const data = (await response.json()) as {
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message || "Failed to stop Opencode web");
    }
  };

  const handleOpenOpenCodeWeb = async () => {
    if (!opencodeWebUrl || !opencodeApiUrl) {
      return;
    }

    setIsOpeningOpenCodeWeb(true);

    try {
      await startOpenCodeWeb();
      window.open(opencodeWebUrl, "_blank", "noopener,noreferrer");
      setIsOpenCodeConnected(true);
    } catch {
      // Silently handle error
    } finally {
      setIsOpeningOpenCodeWeb(false);
    }
  };

  const handleStopOpenCodeWeb = async () => {
    if (!opencodeApiUrl) {
      return;
    }

    setIsStoppingOpenCodeWeb(true);

    try {
      await stopOpenCodeWeb();
      setIsOpenCodeConnected(false);
    } catch {
      // Silently handle error
    } finally {
      setIsStoppingOpenCodeWeb(false);
    }
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
              isOpeningOpenCodeWeb ||
              isStoppingOpenCodeWeb ||
              !domainFor8080
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
            {isOpeningOpenCodeWeb ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="sr-only sm:not-sr-only">Opening...</span>
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
              isStoppingOpenCodeWeb ||
              isOpeningOpenCodeWeb ||
              !domainFor8080 ||
              !isOpenCodeConnected
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
