"use client";

import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export default function ClientView() {
  // const SERVER_URL = "http://13.233.161.174:8080";
  const SERVER_URL = "ws://3.109.4.229:8080/ws";
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
    <div className="p-8">
      <h1 className="text-3xl font-bold tracking-tight">Server Name</h1>
      <div className="mt-12">
        <div
          ref={terminalRef}
          id="terminal"
          className="h-[80vh] w-full rounded-md bg-black p-2"
        />
      </div>
    </div>
  );
}
