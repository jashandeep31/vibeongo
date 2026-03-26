"use client";

import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { ProjectInstanceInfoCard } from "@/components/project/project-instance-info-card";
import { useGetInstanceById } from "@/hooks/use-instance";
import { Card } from "@repo/ui/components/card";

export default function ClientView({ instanceId }: { instanceId: string }) {
  const { data: instance } = useGetInstanceById(instanceId);

  const serverUrl = instance?.public_ip
    ? `ws://${String(instance.public_ip)}:8080/ws`
    : null;
  const terminalRef = useRef<HTMLDivElement | null>(null);

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
      ws.close();
      term.dispose();
    };
  }, [serverUrl]);

  if (!instance) return <Card>Instance not found</Card>;

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Instance Terminal</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Live shell session and runtime information for this instance.
        </p>
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
