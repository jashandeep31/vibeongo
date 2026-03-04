"use client";

import { useEffect, useRef } from "react";
import { Button } from "@repo/ui/components/button";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:8080";

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
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
    });

    term.open(terminalRef.current);

    const ws = new WebSocket(WS_URL);

    // Server -> Terminal
    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      term.write("\r\nConnection closed\r\n");
    };

    // Terminal -> Server
    term.onData((data) => {
      ws.send(data);
    });

    return () => {
      ws.close();
      term.dispose();
    };
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Web Terminal</h1>

      <Button>Shadcn is working</Button>

      <div
        ref={terminalRef}
        id="terminal"
        className="w-full h-[500px] bg-black rounded-md p-2"
      />
    </div>
  );
}
