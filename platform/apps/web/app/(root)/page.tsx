"use client";

import { useEffect, useRef } from "react";
import { Button } from "@repo/ui/components/button";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { FitAddon } from "@xterm/addon-fit";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ?? "http://43.205.253.22:8080";

const WS_URL = (() => {
  try {
    const url = new URL(API_BASE_URL);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "ws://localhost:8080/ws";
  }
})();

export default function Page() {
  const terminalRef = useRef<HTMLDivElement | null>(null);

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

    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
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

    // Server -> Terminal
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
      if (fitFrame) {
        window.cancelAnimationFrame(fitFrame);
      }
      window.removeEventListener("resize", scheduleFit);
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, []);

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-bold">Web Terminal</h1>
      <Button>Shadcn is working</Button>
      <div
        ref={terminalRef}
        id="terminal"
        className="h-[80vh] w-full rounded-md bg-black p-2"
      />
    </div>
  );
}
