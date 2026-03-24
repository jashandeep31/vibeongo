"use client";

import { Terminal } from "@xterm/xterm";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useGetInstanceById } from "@/hooks/use-instance";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

const formatDate = (value: unknown) => {
  if (!value) return "N/A";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
};

export default function ClientView({ instanceId }: { instanceId: string }) {
  const { data: instance, isLoading, isError } = useGetInstanceById(instanceId);
  const SERVER_URL = "ws://3.109.4.229:8080/ws";
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const copyResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const handleCopyPublicIp = async () => {
    const publicIp = instance?.public_ip;

    if (!publicIp) {
      return;
    }

    try {
      await navigator.clipboard.writeText(String(publicIp));
      setCopied(true);

      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      copyResetTimerRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  useEffect(() => {
    const terminalElement = terminalRef.current;
    if (!terminalElement) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalElement);

    const ws = new WebSocket(SERVER_URL);

    const sendTerminalSize = () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      console.log(term.rows, term.cols);
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
      ws.close();
      term.dispose();
    };
  }, []);

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Instance Terminal</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Live shell session and runtime information for this instance.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center">
            Loading instance details...
          </CardContent>
        </Card>
      ) : isError || !instance ? (
        <Card>
          <CardContent className="text-destructive py-8 text-center">
            Failed to load instance details.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">
                  Instance {formatValue(instance.aws_instance_id)}
                </CardTitle>
                <CardDescription className="mt-1 break-all">
                  Record ID: {instance.id}
                </CardDescription>
              </div>
              <Badge
                variant={instance.state === "running" ? "default" : "secondary"}
                className={
                  instance.state === "running"
                    ? "border-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                    : "text-muted-foreground border-0"
                }
              >
                {formatValue(instance.state)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Public IP</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-medium">{formatValue(instance.public_ip)}</p>
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    aria-label="Copy IPv4 address"
                    onClick={() => {
                      void handleCopyPublicIp();
                    }}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium">{formatDate(instance.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Started At</p>
                <p className="font-medium">{formatDate(instance.started_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Terminated At</p>
                <p className="font-medium">
                  {formatDate(instance.terminated_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
