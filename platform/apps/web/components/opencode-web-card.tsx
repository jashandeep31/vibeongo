"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Globe, Square } from "lucide-react";
import { Button } from "@repo/ui/components/button";

interface OpencodeWebCardProps {
  domainFor8080: string | null;
  domainFor4096: string | null;
  isTerminated: boolean;
}

export function OpencodeWebCard({
  domainFor8080,
  domainFor4096,
  isTerminated,
}: OpencodeWebCardProps) {
  const [isOpeningOpenCodeWeb, setIsOpeningOpenCodeWeb] = useState(false);
  const [isStoppingOpenCodeWeb, setIsStoppingOpenCodeWeb] = useState(false);
  const [isOpenCodeConnected, setIsOpenCodeConnected] = useState(false);

  const opencodeApiUrl = domainFor8080
    ? `https://${domainFor8080}/opencode/web`
    : null;
  const opencodeStatusApiUrl = domainFor8080
    ? `https://${domainFor8080}/opencode/web/status`
    : null;
  const opencodeWebUrl = domainFor4096 ? `https://${domainFor4096}` : null;

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
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Opencode Web</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage Opencode web server and open it in a new tab.
        </p>
      </div>

      <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span
            className={
              isOpenCodeConnected
                ? "h-2.5 w-2.5 rounded-full bg-emerald-500"
                : "h-2.5 w-2.5 rounded-full bg-red-500"
            }
          />
          {isOpenCodeConnected ? "Connected" : "Disconnected"}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="lg"
            variant="outline"
            type="button"
            disabled={
              isTerminated ||
              isOpeningOpenCodeWeb ||
              isStoppingOpenCodeWeb ||
              !domainFor8080
            }
            onClick={() => {
              handleOpenOpenCodeWeb();
            }}
          >
            {isOpeningOpenCodeWeb ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                {isOpenCodeConnected ? "Open Web" : "Start Web"}
              </>
            )}
          </Button>

          <Button
            size="lg"
            variant="outline"
            type="button"
            disabled={
              isTerminated ||
              isStoppingOpenCodeWeb ||
              isOpeningOpenCodeWeb ||
              !domainFor8080 ||
              !isOpenCodeConnected
            }
            onClick={() => {
              handleStopOpenCodeWeb();
            }}
          >
            {isStoppingOpenCodeWeb ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Stopping...
              </>
            ) : (
              <>
                <Square className="h-4 w-4" />
                Stop
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
