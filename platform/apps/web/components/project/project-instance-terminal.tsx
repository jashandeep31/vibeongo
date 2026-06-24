"use client";

import { useEffect, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { Plus, X } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { useWebSocketContext } from "@/hooks/use-websocket";
import "@xterm/xterm/css/xterm.css";

export function ProjectInstanceTerminal() {
  const { websocket, sendJsonMessage, subscribeJsonMessage } =
    useWebSocketContext();
  const [terminalSessionIds, setTerminalSessionIds] = useState<string[]>([]);
  const [activeTerminalSessionId, setActiveTerminalSessionId] = useState<
    string | null
  >(null);
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const isReplayingPtyBufferRef = useRef(false);

  useEffect(() => {
    if (!websocket) return;

    const terminalElement = terminalRef.current;
    if (!terminalElement) return;

    const isMobileViewport = window.matchMedia("(max-width: 639px)").matches;
    const term = new Terminal({
      cursorBlink: true,
      fontSize: isMobileViewport ? 12 : 14,
      scrollback: 5000,
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalElement);

    const sendTerminalSize = () => {
      if (websocket.readyState !== WebSocket.OPEN) return;
      sendJsonMessage({
        type: "size",
        data: {
          rows: term.rows,
          cols: term.cols,
        },
      });
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

    const writeToTerminal = (
      data: string | Uint8Array,
      options?: { replay?: boolean },
    ) => {
      term.write(data, () => {
        if (options?.replay) {
          isReplayingPtyBufferRef.current = false;
          scheduleFit();
        }
      });
    };

    const unsubscribeMessages = subscribeJsonMessage((parsed) => {
      if (parsed.type === "terminal") {
        if (typeof parsed.data !== "string") {
          return;
        }

        const isReplay = isReplayingPtyBufferRef.current;
        writeToTerminal(parsed.data, { replay: isReplay });
        return;
      }

      if (parsed.type === "sessionIds") {
        if (!Array.isArray(parsed.ids)) {
          return;
        }

        const ids = parsed.ids.filter(
          (id): id is string => typeof id === "string",
        );
        setTerminalSessionIds(ids);
        setActiveTerminalSessionId(
          typeof parsed.activeId === "string" ? parsed.activeId : null,
        );
        return;
      }

      if (parsed.type === "ptyUpdate") {
        if (typeof parsed.sessionId === "string") {
          setActiveTerminalSessionId(parsed.sessionId);
        }

        isReplayingPtyBufferRef.current = parsed.hasBuffer === true;
        term.reset();
        scheduleFit();
      }
    });

    const handleClose = () => {
      term.write("\r\nConnection closed\r\n");
    };

    scheduleFit();

    const resizeObserver = new ResizeObserver(() => {
      scheduleFit();
    });
    resizeObserver.observe(terminalElement);

    window.addEventListener("resize", scheduleFit);
    websocket.addEventListener("close", handleClose);

    const dataSubscription = term.onData((data) => {
      if (isReplayingPtyBufferRef.current) return;

      if (websocket.readyState === WebSocket.OPEN) {
        sendJsonMessage({
          type: "terminal",
          data: data,
        });
      }
    });

    return () => {
      window.removeEventListener("resize", scheduleFit);
      websocket.removeEventListener("close", handleClose);
      unsubscribeMessages();
      resizeObserver.disconnect();
      dataSubscription.dispose();
      term.dispose();
    };
  }, [sendJsonMessage, subscribeJsonMessage, websocket]);

  return (
    <div className="max-w-full min-w-0 space-y-4 overflow-x-hidden">
      <div className="bg-background max-w-full min-w-0 overflow-hidden rounded-lg border shadow-sm">
        <div className="bg-muted/40 min-w-0 overflow-x-hidden border-b px-3 py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {terminalSessionIds.map((id, index) => {
              const isActive = id === activeTerminalSessionId;

              return (
                <ButtonGroup key={id}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="min-w-24 justify-start"
                    onClick={() => {
                      setActiveTerminalSessionId(id);
                      sendJsonMessage({
                        type: "switchSession",
                        data: {
                          sessionId: id,
                        },
                      });
                    }}
                  >
                    Terminal {index + 1}
                  </Button>
                  <ConfirmationDialog
                    title={`Close terminal ${index + 1}?`}
                    description="This will end the terminal session. Any running command in this terminal will be stopped."
                    confirmText="Close terminal"
                    isDestructive
                    onConfirm={() => {
                      sendJsonMessage({
                        type: "endSession",
                        data: {
                          sessionId: id,
                        },
                      });
                    }}
                  >
                    <Button
                      type="button"
                      variant={isActive ? "default" : "ghost"}
                      size="icon-sm"
                      aria-label={`Close terminal ${index + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </ConfirmationDialog>
                </ButtonGroup>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sendJsonMessage({ type: "newSession" });
              }}
            >
              <Plus className="h-4 w-4" />
              Add terminal
            </Button>
          </div>
        </div>

        <div className="max-w-full min-w-0 overflow-hidden bg-[#111111] p-1.5 sm:p-2">
          <div
            ref={terminalRef}
            id="terminal"
            className="h-[55svh] min-h-[280px] w-full max-w-full min-w-0 overflow-hidden rounded-md bg-[#1e1e1e] p-1.5 sm:h-[min(70vh,720px)] sm:min-h-[420px] sm:p-2 [&_.xterm]:max-w-full [&_.xterm-screen]:max-w-full [&_.xterm-viewport]:max-w-full"
          />
        </div>
      </div>
    </div>
  );
}
