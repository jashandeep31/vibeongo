"use client";
import { Terminal } from "@xterm/xterm";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { ProjectInstanceInfoCard } from "@/components/project/project-instance-info-card";
import { useGetInstanceById, useTerminateInstance } from "@/hooks/use-instance";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { toast } from "sonner";

type TerminalConnectionStatus = "checking" | "connected" | "disconnected";

export default function ClientView({ instanceId }: { instanceId: string }) {
  const { data: instance } = useGetInstanceById(instanceId);
  const { mutateAsync: terminateInstance, isPending } = useTerminateInstance(
    instance?.project_id || "",
  );
  const isTerminated =
    instance?.state === "terminated" || !!instance?.terminated_at;

  const serverUrl = instance?.public_ip
    ? `ws://${String(instance.public_ip)}:8080/ws`
    : null;
  const healthCheckUrl = instance?.public_ip
    ? // ? `http://${String(instance.public_ip)}:8080`
      `http://localhost:8080`
    : null;
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<TerminalConnectionStatus>("checking");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!healthCheckUrl) {
      setConnectionStatus("disconnected");
      return;
    }

    let isDisposed = false;

    const checkInstanceConnection = async () => {
      setConnectionStatus("checking");

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, 6000);

      try {
        const response = await fetch(healthCheckUrl, {
          method: "GET",
          signal: controller.signal,
        });

        if (!isDisposed) {
          setConnectionStatus(
            response.status === 200 ? "connected" : "disconnected",
          );
        }
      } catch {
        if (!isDisposed) {
          setConnectionStatus("disconnected");
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    void checkInstanceConnection();

    const intervalId = window.setInterval(() => {
      void checkInstanceConnection();
    }, 30000);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
    };
  }, [healthCheckUrl, refreshToken]);

  useEffect(() => {
    if (!serverUrl) return;

    const terminalElement = terminalRef.current;
    if (!terminalElement) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalElement);

    const ws = new WebSocket(serverUrl);

    const sendTerminalSize = () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: "size",
          data: {
            rows: term.rows,
            cols: term.cols,
          },
        }),
      );
    };

    const fitTerminal = () => {
      fitAddon.fit();
      sendTerminalSize();
    };

    let fitFrame = 0;
    const scheduleFit = () => {
      if (fitFrame) {
        window.cancelAnimationFrame(fitFrame);
      }

      fitFrame = window.requestAnimationFrame(() => {
        fitFrame = 0;
        fitTerminal();
      });
    };

    scheduleFit();

    const resizeObserver = new ResizeObserver(() => {
      scheduleFit();
    });
    resizeObserver.observe(terminalElement);

    window.addEventListener("resize", scheduleFit);

    ws.onopen = () => {
      scheduleFit();
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === "string") {
        term.write(event.data);
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(event.data));
        return;
      }

      if (event.data instanceof Blob) {
        const buffer = await event.data.arrayBuffer();
        term.write(new Uint8Array(buffer));
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      term.write("\r\nConnection closed\r\n");
    };

    // Terminal -> Server
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    return () => {
      window.removeEventListener("resize", scheduleFit);
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, [serverUrl, refreshToken]);

  const handleTerminate = async () => {
    if (!instance || isTerminated) {
      return;
    }

    const toastId = toast.loading("Terminating instance...");
    try {
      await terminateInstance(instance.id);
      toast.success("Instance terminated", { id: toastId });
    } catch {
      toast.error("Failed to terminate instance", { id: toastId });
    }
  };

  if (!instance) return <Card>Instance not found</Card>;

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Instance Terminal
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Live shell session and runtime information for this instance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="lg"
            variant="outline"
            type="button"
            onClick={() => {
              setRefreshToken((value) => value + 1);
            }}
            className={
              connectionStatus === "connected"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                : connectionStatus === "checking"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
                  : "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
            }
          >
            <RotateCcw className="h-4 w-4" />
            {connectionStatus === "connected"
              ? "Connected"
              : connectionStatus === "checking"
                ? "Checking"
                : "Disconnected"}
          </Button>

          <Button
            size="lg"
            variant="destructive"
            type="button"
            disabled={isPending || isTerminated}
            onClick={() => {
              void handleTerminate();
            }}
          >
            <Trash2 className="h-3 w-3" />
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Terminating...
              </>
            ) : isTerminated ? (
              "Terminated"
            ) : (
              "Terminate"
            )}
          </Button>
        </div>
      </div>

      <ProjectInstanceInfoCard instance={instance} />

      <div>
        <h2 className="text-xl font-semibold tracking-tight">Terminal</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Interactive session connected through WebSocket.
        </p>
      </div>

      <div>
        <div
          ref={terminalRef}
          id="terminal"
          className="h-[80vh] w-full rounded-md bg-black p-2"
        />
      </div>
    </div>
  );
}
