"use dom";

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useDOMImperativeHandle, type DOMImperativeFactory } from "expo/dom";
import { useEffect, useRef } from "react";

import "@xterm/xterm/css/xterm.css";

export interface ProjectTerminalDomRef extends DOMImperativeFactory {
  focus: () => void;
  replace: DOMImperativeFactory[string];
  reset: () => void;
  setInputEnabled: DOMImperativeFactory[string];
  write: DOMImperativeFactory[string];
}

type TerminalOperation =
  | { data: string; type: "replace" | "write" }
  | { type: "reset" };

export default function ProjectTerminalDom({
  onInput,
  onReady,
  onResize,
  ref,
}: {
  dom?: import("expo/dom").DOMProps;
  onInput: (data: string) => Promise<void>;
  onReady: () => Promise<void>;
  onResize: (rows: number, cols: number) => Promise<void>;
  ref: unknown;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const isDrainingRef = useRef(false);
  const isReplayingRef = useRef(false);
  const operationQueueRef = useRef<TerminalOperation[]>([]);
  const terminalRef = useRef<Terminal | null>(null);
  const onInputRef = useRef(onInput);
  const onReadyRef = useRef(onReady);
  const onResizeRef = useRef(onResize);

  onInputRef.current = onInput;
  onReadyRef.current = onReady;
  onResizeRef.current = onResize;

  const drainOperations = () => {
    const terminal = terminalRef.current;
    const operation = operationQueueRef.current[0];
    if (!terminal || !operation || isDrainingRef.current) return;

    isDrainingRef.current = true;
    const finish = () => {
      if (operation.type === "replace") {
        isReplayingRef.current = false;
      }
      operationQueueRef.current.shift();
      isDrainingRef.current = false;
      drainOperations();
    };

    if (operation.type === "reset") {
      terminal.reset();
      finish();
      return;
    }

    if (operation.type === "replace") {
      isReplayingRef.current = true;
      terminal.reset();
    }
    if (!operation.data) {
      finish();
      return;
    }
    terminal.write(operation.data, finish);
  };

  const enqueueOperation = (operation: TerminalOperation) => {
    operationQueueRef.current.push(operation);
    drainOperations();
  };

  useDOMImperativeHandle<ProjectTerminalDomRef>(
    ref as Parameters<typeof useDOMImperativeHandle<ProjectTerminalDomRef>>[0],
    () => ({
      focus: () => {
        terminalRef.current?.focus();
      },
      replace: (...args) => {
        const data = args[0];
        if (typeof data === "string") {
          enqueueOperation({ data, type: "replace" });
        }
      },
      reset: () => {
        enqueueOperation({ type: "reset" });
      },
      setInputEnabled: (...args) => {
        const enabled = args[0];
        if (typeof enabled === "boolean" && terminalRef.current) {
          terminalRef.current.options.disableStdin = !enabled;
        }
      },
      write: (...args) => {
        const data = args[0];
        if (typeof data === "string") {
          enqueueOperation({ data, type: "write" });
        }
      },
    }),
    [],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const terminal = new Terminal({
      allowProposedApi: false,
      convertEol: false,
      cursorBlink: true,
      cursorStyle: "bar",
      fontFamily:
        'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
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
    drainOperations();

    const input = terminal.textarea;
    if (input) {
      input.autocomplete = "off";
      input.autocapitalize = "none";
      input.setAttribute("autocorrect", "off");
      input.setAttribute("aria-autocomplete", "none");
      input.spellcheck = false;
    }

    let fitFrame = 0;
    let lastRows = 0;
    let lastCols = 0;
    const fit = () => {
      if (!host.clientWidth || !host.clientHeight) return;
      try {
        fitAddon.fit();
      } catch {
        return;
      }
      if (terminal.rows === lastRows && terminal.cols === lastCols) return;
      lastRows = terminal.rows;
      lastCols = terminal.cols;
      void onResizeRef.current(terminal.rows, terminal.cols);
    };
    const scheduleFit = () => {
      cancelAnimationFrame(fitFrame);
      fitFrame = requestAnimationFrame(fit);
    };

    const dataSubscription = terminal.onData((data) => {
      if (isReplayingRef.current) return;
      void onInputRef.current(data);
    });
    const resizeObserver = new ResizeObserver(scheduleFit);
    const focusTerminal = () => terminal.focus();
    resizeObserver.observe(host);
    window.addEventListener("resize", scheduleFit);
    host.addEventListener("pointerdown", focusTerminal);
    scheduleFit();
    terminal.focus();
    void onReadyRef.current();

    return () => {
      cancelAnimationFrame(fitFrame);
      window.removeEventListener("resize", scheduleFit);
      host.removeEventListener("pointerdown", focusTerminal);
      resizeObserver.disconnect();
      dataSubscription.dispose();
      operationQueueRef.current = [];
      isDrainingRef.current = false;
      isReplayingRef.current = false;
      terminal.dispose();
      terminalRef.current = null;
    };
  }, []);

  return (
    <main>
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root, main, #terminal-host {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
          background: #000;
        }
        main { padding: 8px 4px 4px; }
        #terminal-host .xterm { height: 100%; }
        #terminal-host .xterm-viewport { overscroll-behavior: contain; }
      `}</style>
      <div aria-label="Terminal" id="terminal-host" ref={hostRef} />
    </main>
  );
}
