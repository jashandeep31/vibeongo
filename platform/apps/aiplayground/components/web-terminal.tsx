"use client";

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";

import type { WebTerminalEvent } from "@/hooks/use-web-terminal-session-socket";
import type { WebTerminalSocketStatus } from "@/hooks/use-web-terminal-workspace-socket";
import "@xterm/xterm/css/xterm.css";

export function WebTerminal({
  sendInput,
  sendResize,
  status,
  subscribe,
}: {
  sendInput: (data: string) => boolean;
  sendResize: (cols: number, rows: number) => boolean;
  status: WebTerminalSocketStatus;
  subscribe: (listener: (event: WebTerminalEvent) => void) => () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const statusRef = useRef(status);
  const awaitingBufferReplayRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.options.disableStdin = status !== "connected";
    if (status === "connected") terminal.focus();
  }, [status]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const terminal = new Terminal({
      convertEol: false,
      cursorBlink: true,
      cursorStyle: "bar",
      disableStdin: statusRef.current !== "connected",
      fontFamily:
        'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace',
      fontSize: window.matchMedia("(max-width: 639px)").matches ? 12 : 14,
      scrollback: 5_000,
      theme: {
        background: "#000000",
        cursor: "#f8f8f2",
        foreground: "#f8f8f2",
        selectionBackground: "#47556999",
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(host);
    terminalRef.current = terminal;

    let fitFrame = 0;
    const fit = () => {
      if (!host.clientWidth || !host.clientHeight) return;
      try {
        fitAddon.fit();
        sendResize(terminal.cols, terminal.rows);
      } catch {
        // The terminal may be between layout and disposal.
      }
    };
    const scheduleFit = () => {
      cancelAnimationFrame(fitFrame);
      fitFrame = requestAnimationFrame(fit);
    };

    const unsubscribe = subscribe((event) => {
      if (event.type === "session") {
        awaitingBufferReplayRef.current = event.hasBuffer;
        terminal.reset();
        scheduleFit();
        return;
      }

      const isBufferReplay = awaitingBufferReplayRef.current;
      terminal.write(event.data, () => {
        if (isBufferReplay) {
          awaitingBufferReplayRef.current = false;
          scheduleFit();
        }
      });
    });
    const inputSubscription = terminal.onData((data) => {
      if (
        statusRef.current === "connected" &&
        !awaitingBufferReplayRef.current
      ) {
        sendInput(data);
      }
    });
    const resizeObserver = new ResizeObserver(scheduleFit);
    resizeObserver.observe(host);
    window.addEventListener("resize", scheduleFit);
    scheduleFit();

    return () => {
      cancelAnimationFrame(fitFrame);
      window.removeEventListener("resize", scheduleFit);
      resizeObserver.disconnect();
      inputSubscription.dispose();
      unsubscribe();
      terminalRef.current = null;
      terminal.dispose();
    };
  }, [sendInput, sendResize, subscribe]);

  return (
    <div
      ref={hostRef}
      aria-label="Interactive terminal"
      className="h-full min-h-0 w-full min-w-0 overflow-hidden bg-black p-2 [&_.xterm]:max-w-full [&_.xterm-screen]:max-w-full [&_.xterm-viewport]:max-w-full"
    />
  );
}
