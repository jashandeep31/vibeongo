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
  setPanMode: DOMImperativeFactory[string];
  write: DOMImperativeFactory[string];
  zoomIn: () => void;
  zoomOut: () => void;
}

type TerminalOperation =
  | { data: string; type: "replace" | "write" }
  | { type: "reset" };

type TerminalTheme = {
  background: string;
  cursor: string;
  foreground: string;
  selectionBackground: string;
};

const DEFAULT_TERMINAL_THEME: TerminalTheme = {
  background: "#000000",
  cursor: "#f8f8f2",
  foreground: "#f8f8f2",
  selectionBackground: "#47556999",
};

const PREVIEW_SURFACE_SIZE = 500;

export default function ProjectTerminalDom({
  onInput,
  onReady,
  onResize,
  preview = false,
  ref,
  terminalTheme,
}: {
  dom?: import("expo/dom").DOMProps;
  onInput: (data: string) => Promise<void>;
  onReady: () => Promise<void>;
  onResize: (rows: number, cols: number) => Promise<void>;
  preview?: boolean;
  ref: unknown;
  terminalTheme?: TerminalTheme;
}) {
  const resolvedTerminalTheme = terminalTheme ?? DEFAULT_TERMINAL_THEME;
  const hostRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement>(null);
  const isDrainingRef = useRef(false);
  const inputEnabledRef = useRef(false);
  const isReplayingRef = useRef(false);
  const operationQueueRef = useRef<TerminalOperation[]>([]);
  const panModeRef = useRef(false);
  const terminalRef = useRef<Terminal | null>(null);
  const terminalThemeRef = useRef(resolvedTerminalTheme);
  const refitTerminalRef = useRef<() => void>(() => {});
  const onInputRef = useRef(onInput);
  const onReadyRef = useRef(onReady);
  const onResizeRef = useRef(onResize);

  onInputRef.current = onInput;
  onReadyRef.current = onReady;
  onResizeRef.current = onResize;
  terminalThemeRef.current = resolvedTerminalTheme;

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

  const applyInputMode = () => {
    if (terminalRef.current) {
      terminalRef.current.options.disableStdin =
        !inputEnabledRef.current || panModeRef.current;
    }
  };

  useDOMImperativeHandle<ProjectTerminalDomRef>(
    ref as Parameters<typeof useDOMImperativeHandle<ProjectTerminalDomRef>>[0],
    () => ({
      focus: () => {
        if (!panModeRef.current) terminalRef.current?.focus();
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
        if (typeof enabled === "boolean") {
          inputEnabledRef.current = enabled;
          applyInputMode();
        }
      },
      setPanMode: (...args) => {
        const enabled = args[0];
        if (typeof enabled === "boolean") {
          panModeRef.current = enabled;
          hostRef.current?.classList.toggle("pan-mode", enabled);
          applyInputMode();
          if (enabled) terminalRef.current?.textarea?.blur();
        }
      },
      write: (...args) => {
        const data = args[0];
        if (typeof data === "string") {
          enqueueOperation({ data, type: "write" });
        }
      },
      zoomIn: () => {
        const terminal = terminalRef.current;
        if (!terminal) return;
        terminal.options.fontSize = Math.min(
          24,
          (terminal.options.fontSize ?? 13) + 1,
        );
        refitTerminalRef.current();
      },
      zoomOut: () => {
        const terminal = terminalRef.current;
        if (!terminal) return;
        terminal.options.fontSize = Math.max(
          9,
          (terminal.options.fontSize ?? 13) - 1,
        );
        refitTerminalRef.current();
      },
    }),
    [],
  );

  useEffect(() => {
    const host = hostRef.current;
    const surface = surfaceRef.current;
    const viewport = viewportRef.current;
    if (!host || !surface || !viewport) return;

    const terminal = new Terminal({
      allowProposedApi: false,
      convertEol: false,
      cursorBlink: !preview,
      cursorStyle: "bar",
      fontFamily:
        'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace',
      ...(preview
        ? {
            fontSize: 12,
            letterSpacing: 1,
            lineHeight: 1,
            scrollback: 500,
          }
        : { fontSize: 13, scrollback: 5_000 }),
      theme: terminalThemeRef.current,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(host);
    terminalRef.current = terminal;
    applyInputMode();
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
      if (!host.clientWidth || !host.clientHeight) {
        return;
      }
      if (preview) {
        surface.style.left = "0";
        surface.style.top = "0";
        surface.style.transform = "none";
      }
      try {
        fitAddon.fit();
      } catch {
        return;
      }
      if (preview) {
        const scale = Math.min(
          viewport.clientWidth / PREVIEW_SURFACE_SIZE,
          viewport.clientHeight / PREVIEW_SURFACE_SIZE,
        );
        surface.style.left = `${Math.max(
          0,
          (viewport.clientWidth - PREVIEW_SURFACE_SIZE * scale) / 2,
        )}px`;
        surface.style.top = `${Math.max(
          0,
          (viewport.clientHeight - PREVIEW_SURFACE_SIZE * scale) / 2,
        )}px`;
        surface.style.transform = `scale(${scale})`;
      }
      if (terminal.rows === lastRows && terminal.cols === lastCols) return;
      lastRows = terminal.rows;
      lastCols = terminal.cols;
      if (!preview) {
        void onResizeRef.current(terminal.rows, terminal.cols);
      }
    };
    const scheduleFit = () => {
      cancelAnimationFrame(fitFrame);
      fitFrame = requestAnimationFrame(fit);
    };
    refitTerminalRef.current = scheduleFit;

    const dataSubscription = terminal.onData((data) => {
      if (isReplayingRef.current) return;
      void onInputRef.current(data);
    });
    const resizeObserver = new ResizeObserver(scheduleFit);
    let panLastY: number | null = null;
    let panRemainder = 0;
    const focusTerminal = () => {
      if (!panModeRef.current) terminal.focus();
    };
    const startPan = (event: TouchEvent) => {
      if (!panModeRef.current || event.touches.length !== 1) return;
      event.preventDefault();
      panLastY = event.touches[0]?.clientY ?? null;
      panRemainder = 0;
    };
    const movePan = (event: TouchEvent) => {
      if (
        !panModeRef.current ||
        panLastY === null ||
        event.touches.length !== 1
      ) {
        return;
      }
      const clientY = event.touches[0]?.clientY;
      if (clientY === undefined) return;
      event.preventDefault();
      const row = host.querySelector<HTMLElement>(".xterm-rows > div");
      const rowHeight = Math.max(1, row?.getBoundingClientRect().height ?? 16);
      panRemainder += panLastY - clientY;
      panLastY = clientY;

      const lines = Math.trunc(panRemainder / rowHeight);
      if (lines !== 0) {
        terminal.scrollLines(lines);
        panRemainder -= lines * rowHeight;
      }
    };
    const endPan = () => {
      panLastY = null;
      panRemainder = 0;
    };
    resizeObserver.observe(preview ? viewport : host);
    window.addEventListener("resize", scheduleFit);
    host.addEventListener("pointerdown", focusTerminal);
    host.addEventListener("touchstart", startPan, {
      capture: true,
      passive: false,
    });
    host.addEventListener("touchmove", movePan, {
      capture: true,
      passive: false,
    });
    host.addEventListener("touchend", endPan, true);
    host.addEventListener("touchcancel", endPan, true);
    scheduleFit();
    if (!preview) terminal.focus();
    void onReadyRef.current();

    return () => {
      cancelAnimationFrame(fitFrame);
      window.removeEventListener("resize", scheduleFit);
      host.removeEventListener("pointerdown", focusTerminal);
      host.removeEventListener("touchstart", startPan, true);
      host.removeEventListener("touchmove", movePan, true);
      host.removeEventListener("touchend", endPan, true);
      host.removeEventListener("touchcancel", endPan, true);
      resizeObserver.disconnect();
      dataSubscription.dispose();
      operationQueueRef.current = [];
      isDrainingRef.current = false;
      isReplayingRef.current = false;
      terminal.dispose();
      terminalRef.current = null;
      refitTerminalRef.current = () => {};
    };
  }, [preview]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = resolvedTerminalTheme;
    }
  }, [resolvedTerminalTheme]);

  return (
    <main className={preview ? "preview" : undefined} ref={viewportRef}>
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root, main, #terminal-surface, #terminal-host {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
          background: ${resolvedTerminalTheme.background};
        }
        main {
          padding: ${preview ? "0" : "8px 4px 4px"};
          position: relative;
        }
        #terminal-surface { position: relative; }
        main.preview #terminal-surface {
          height: ${PREVIEW_SURFACE_SIZE}px;
          position: absolute;
          transform-origin: top left;
          width: ${PREVIEW_SURFACE_SIZE}px;
        }
        #terminal-host .xterm,
        #terminal-host .xterm-screen,
        #terminal-host .xterm-viewport {
          background-color: ${resolvedTerminalTheme.background} !important;
        }
        #terminal-host .xterm { height: 100%; }
        #terminal-host .xterm-viewport {
          overflow-x: hidden !important;
          overscroll-behavior: contain;
          scrollbar-color: transparent transparent;
          scrollbar-width: none;
        }
        #terminal-host .xterm-viewport::-webkit-scrollbar {
          display: none;
          height: 0;
          width: 0;
        }
        #terminal-host.pan-mode { cursor: grab; touch-action: none; }
        #terminal-host.pan-mode:active { cursor: grabbing; }
      `}</style>
      <div id="terminal-surface" ref={surfaceRef}>
        <div aria-label="Terminal" id="terminal-host" ref={hostRef} />
      </div>
    </main>
  );
}
