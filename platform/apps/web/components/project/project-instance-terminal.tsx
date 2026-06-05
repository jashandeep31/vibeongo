"use client";

import { useEffect, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { Copy, Plus, RotateCcw, X } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { toast } from "sonner";
import "@xterm/xterm/css/xterm.css";

type TerminalConnectionStatus = "checking" | "connected" | "disconnected";

interface ProjectInstanceTerminalProps {
  publicIp?: string | null;
  domain?: string | null;
  hideControls?: boolean;
  showConnectionButton?: boolean;
}

export function ProjectInstanceTerminal({
  publicIp,
  domain,
  hideControls = false,
  showConnectionButton = true,
}: ProjectInstanceTerminalProps) {
  const serverUrl = domain
    ? `wss://${domain}/ws`
    : publicIp
      ? `wss://${String(publicIp)}:8080/ws`
      : null;
  const healthCheckUrl = domain
    ? `https://${domain}`
    : publicIp
      ? `https://${String(publicIp)}:8080`
      : null;
  const sshCommand = publicIp ? `ssh ubuntu@${String(publicIp)}` : null;

  const [webSocketConnection, setWebSocketConnection] =
    useState<WebSocket | null>(null);
  const [terminalSessionIds, setTerminalSessionIds] = useState<string[]>([]);
  const [activeTerminalSessionId, setActiveTerminalSessionId] = useState<
    string | null
  >(null);
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const isReplayingPtyBufferRef = useRef(false);
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

    ws.onopen = () => {
      setWebSocketConnection(ws);
      scheduleFit();
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === "string") {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === "stats") {
            // we could emit this to a prop or custom event
            const customEvent = new CustomEvent("vps-stats", {
              detail: parsed.data,
            });
            window.dispatchEvent(customEvent);
            return;
          } else if (parsed.type === "sessionIds") {
            if (parsed.ids) {
              setTerminalSessionIds(parsed.ids);
              setActiveTerminalSessionId(parsed.activeId);
              console.log(parsed.ids, parsed.activeId);
              return;
            } else {
              console.log(
                "Parsed ids are not here , Error in the  backend server",
              );
            }
          } else if (parsed.type === "ptyUpdate") {
            if (typeof parsed.sessionId === "string") {
              setActiveTerminalSessionId(parsed.sessionId);
            }
            isReplayingPtyBufferRef.current = parsed.hasBuffer === true;
            term.reset();
            scheduleFit();
            return;
          }
          console.log("Received:", parsed);
        } catch {
          // not json, fall through
        }
        writeToTerminal(event.data);
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        const isReplay = isReplayingPtyBufferRef.current;
        writeToTerminal(new Uint8Array(event.data), { replay: isReplay });
        return;
      }

      if (event.data instanceof Blob) {
        const buffer = await event.data.arrayBuffer();
        const isReplay = isReplayingPtyBufferRef.current;
        writeToTerminal(new Uint8Array(buffer), { replay: isReplay });
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      setWebSocketConnection((current) => (current === ws ? null : current));
      term.write("\r\nConnection closed\r\n");
    };

    term.onData((data) => {
      if (isReplayingPtyBufferRef.current) {
        return;
      }

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

  const handleCopySshCommand = async () => {
    if (!sshCommand) {
      toast.error("Public IP not available");
      return;
    }

    try {
      await navigator.clipboard.writeText(sshCommand);
      toast.success("SSH command copied");
    } catch {
      toast.error("Failed to copy SSH command");
    }
  };

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      {!hideControls && (
        <div className="flex flex-wrap items-center gap-2">
          {showConnectionButton && (
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
          )}

          <Button
            size="lg"
            variant="outline"
            type="button"
            disabled={!sshCommand}
            onClick={() => {
              void handleCopySshCommand();
            }}
          >
            <Copy className="h-4 w-4" />
            SSH
          </Button>
        </div>
      )}

      <div className="bg-background min-w-0 max-w-full overflow-hidden rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Terminal</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Interactive session connected through WebSocket.
            </p>
          </div>
        </div>

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
                      webSocketConnection?.send(
                        JSON.stringify({
                          type: "switchSession",
                          data: {
                            sessionId: id,
                          },
                        }),
                      );
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
                      webSocketConnection?.send(
                        JSON.stringify({
                          type: "endSession",
                          data: {
                            sessionId: id,
                          },
                        }),
                      );
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
                webSocketConnection?.send(
                  JSON.stringify({
                    type: "newSession",
                  }),
                );
              }}
            >
              <Plus className="h-4 w-4" />
              Add terminal
            </Button>
          </div>
        </div>

        <div className="min-w-0 max-w-full overflow-hidden bg-[#111111] p-1.5 sm:p-2">
          <div
            ref={terminalRef}
            id="terminal"
            className="h-[55svh] min-h-[280px] w-full min-w-0 max-w-full overflow-hidden rounded-md bg-[#1e1e1e] p-1.5 sm:h-[min(70vh,720px)] sm:min-h-[420px] sm:p-2 [&_.xterm-screen]:max-w-full [&_.xterm-viewport]:max-w-full [&_.xterm]:max-w-full"
          />
        </div>
      </div>
    </div>
  );
}
