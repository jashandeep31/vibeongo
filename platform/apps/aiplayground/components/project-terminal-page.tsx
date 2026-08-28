"use client";

import { useGetInstances } from "@repo/api-hooks";
import { useSessionsStore } from "@repo/app-store";
import { Button } from "@repo/ui/components/button";
import {
  ChevronRight,
  LoaderCircle,
  Plus,
  Terminal as TerminalIcon,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { TerminalDirectoryDialog } from "@/components/terminal-directory-dialog";
import { WebTerminal } from "@/components/web-terminal";
import { useWebTerminalSessionSocket } from "@/hooks/use-web-terminal-session-socket";
import {
  type WebTerminalSession,
  useWebTerminalWorkspaceSocket,
} from "@/hooks/use-web-terminal-workspace-socket";
import {
  attachWebTmuxTerminalSession,
  createWebTerminalSession,
  killWebTerminalSession,
} from "@/lib/web-terminal-socket";

function getLocalToken(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  const token = (config as Record<string, unknown>).vibeongoLocalToken;
  return typeof token === "string" ? token : "";
}

function getTerminalSessionLabel(session: WebTerminalSession) {
  return session.name;
}

export function ProjectTerminalPage({
  projectSessionId,
}: {
  projectId: string;
  projectSessionId: string;
}) {
  const [selectedTerminalId, setSelectedTerminalId] = useState("");
  const [pendingTerminalId, setPendingTerminalId] = useState("");
  const [isCreatingTerminal, setIsCreatingTerminal] = useState(false);
  const [attachingTmuxTarget, setAttachingTmuxTarget] = useState("");
  const [isDirectoryDialogOpen, setIsDirectoryDialogOpen] = useState(false);
  const [killingTerminalId, setKillingTerminalId] = useState("");
  const [terminalPendingKill, setTerminalPendingKill] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [terminalCreationError, setTerminalCreationError] = useState("");
  const sessionEntry = useSessionsStore((store) =>
    store.sessions.find((entry) => entry.session.id === projectSessionId),
  );
  const instancesQuery = useGetInstances(
    { limit: 1, sessionId: projectSessionId, state: "running" },
    !sessionEntry?.instance,
  );
  const instance = sessionEntry?.instance ?? instancesQuery.data?.data[0];
  const runtimeUrl = instance
    ? `https://3101-${instance.id}${instance.proxy_domain}`
    : "";
  const localToken = getLocalToken(instance?.config);
  const accessToken = instance?.access_token ?? "";
  const socketsEnabled = Boolean(runtimeUrl && localToken && accessToken);

  const workspace = useWebTerminalWorkspaceSocket({
    accessToken,
    enabled: socketsEnabled,
    localToken,
    runtimeUrl,
  });
  const terminal = useWebTerminalSessionSocket({
    accessToken,
    enabled: socketsEnabled && Boolean(selectedTerminalId),
    localToken,
    runtimeUrl,
    sessionId: selectedTerminalId,
  });

  useEffect(() => {
    if (selectedTerminalId === pendingTerminalId) return;
    if (
      selectedTerminalId &&
      workspace.terminalSessionIds.includes(selectedTerminalId)
    ) {
      return;
    }
    setSelectedTerminalId(
      workspace.activeTerminalSessionId ??
        workspace.terminalSessionIds[0] ??
        "",
    );
  }, [
    selectedTerminalId,
    pendingTerminalId,
    workspace.activeTerminalSessionId,
    workspace.terminalSessionIds,
  ]);

  useEffect(() => {
    if (
      pendingTerminalId &&
      workspace.terminalSessionIds.includes(pendingTerminalId)
    ) {
      setPendingTerminalId("");
    }
  }, [pendingTerminalId, workspace.terminalSessionIds]);

  const addTerminal = async (workingDirectory?: string) => {
    if (isCreatingTerminal || attachingTmuxTarget) return;
    setIsDirectoryDialogOpen(false);
    setIsCreatingTerminal(true);
    setTerminalCreationError("");
    try {
      const id = await createWebTerminalSession({
        accessToken,
        localToken,
        runtimeUrl,
        workingDirectory,
      });
      setPendingTerminalId(id);
      setSelectedTerminalId(id);
    } catch {
      setTerminalCreationError("Could not create terminal. Try again.");
    } finally {
      setIsCreatingTerminal(false);
    }
  };

  const attachTmuxTerminal = async ({
    sessionName,
    windowId,
  }: {
    sessionName: string;
    windowId?: string;
  }) => {
    if (isCreatingTerminal || attachingTmuxTarget) return;
    const targetKey = windowId ? `${sessionName}:${windowId}` : sessionName;
    setAttachingTmuxTarget(targetKey);
    setTerminalCreationError("");
    try {
      const id = await attachWebTmuxTerminalSession({
        accessToken,
        localToken,
        runtimeUrl,
        tmuxSessionName: sessionName,
        tmuxWindowId: windowId,
      });
      setPendingTerminalId(id);
      setSelectedTerminalId(id);
    } catch (error) {
      setTerminalCreationError(
        error instanceof Error
          ? error.message
          : "Could not attach to tmux. Try again.",
      );
    } finally {
      setAttachingTmuxTarget("");
    }
  };

  const killTerminal = async (terminalId: string) => {
    if (killingTerminalId) return;
    setKillingTerminalId(terminalId);
    setTerminalCreationError("");
    try {
      await killWebTerminalSession({
        accessToken,
        localToken,
        runtimeUrl,
        terminalId,
      });
    } catch {
      setTerminalCreationError("Could not kill terminal. Try again.");
    } finally {
      setTerminalPendingKill(null);
      setKillingTerminalId("");
    }
  };

  const selectedTerminalIndex = workspace.terminalSessions.findIndex(
    (session) => session.id === selectedTerminalId,
  );
  const selectedTerminalSession =
    workspace.terminalSessions[selectedTerminalIndex];
  const selectedTerminalLabel = isCreatingTerminal
    ? "Creating terminal…"
    : attachingTmuxTarget
      ? "Attaching to tmux…"
      : selectedTerminalSession
        ? getTerminalSessionLabel(selectedTerminalSession)
        : "Terminal";
  const pendingTerminalSession = workspace.terminalSessions.find(
    (session) => session.id === terminalPendingKill?.id,
  );

  const isLoading = !instance && instancesQuery.isPending;
  const errorMessage = instancesQuery.isError
    ? "Could not load the runtime."
    : !instance
      ? "Resume this project session to open its terminal."
      : !localToken || !accessToken
        ? "Terminal credentials are unavailable."
        : null;
  const combinedSocketStatus =
    workspace.status === "error" || terminal.status === "error"
      ? "error"
      : workspace.status === "connected" && terminal.status === "connected"
        ? "connected"
        : workspace.status === "connecting" || terminal.status === "connecting"
          ? "connecting"
          : "disconnected";

  return (
    <div className="bg-background text-foreground flex h-svh min-h-0 w-full flex-col">
      {isLoading ? (
        <PageState loading message="Loading terminal runtime…" />
      ) : errorMessage ? (
        <PageState message={errorMessage} />
      ) : (
        <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[16rem_minmax(0,1fr)] md:grid-rows-1">
          <aside className="bg-muted/20 order-2 flex min-w-0 shrink-0 flex-col overflow-hidden border-t md:order-none md:min-h-0 md:border-t-0 md:border-r">
            <div className="flex min-w-0 flex-nowrap gap-1 overflow-x-auto p-1.5 md:flex-col md:gap-2 md:overflow-y-auto md:p-2">
              <Button
                className="shrink-0 md:w-full"
                type="button"
                size="xs"
                aria-label="New terminal session"
                title="New terminal session"
                disabled={
                  isCreatingTerminal ||
                  Boolean(attachingTmuxTarget) ||
                  workspace.status !== "connected"
                }
                onClick={() => {
                  setTerminalCreationError("");
                  setIsDirectoryDialogOpen(true);
                }}
              >
                {isCreatingTerminal ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Plus />
                )}
                <span>New terminal</span>
              </Button>
              {workspace.terminalSessions.map((terminalSession) => {
                const selected = terminalSession.id === selectedTerminalId;
                const terminalLabel = getTerminalSessionLabel(terminalSession);
                const terminalAction =
                  terminalSession.kind === "tmux" ? "Detach" : "Kill";
                return (
                  <div
                    key={terminalSession.id}
                    className={`flex min-w-max shrink-0 items-center rounded-md border p-1 transition-colors md:min-w-0 md:rounded-lg ${
                      selected
                        ? "border-primary/40 bg-primary/10"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    <button
                      className="flex min-w-0 flex-1 items-center gap-1.5 px-1 py-0.5 text-left md:gap-2 md:px-2 md:py-1"
                      type="button"
                      onClick={() => setSelectedTerminalId(terminalSession.id)}
                    >
                      <TerminalIcon className="size-3.5 shrink-0 md:size-4" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium md:text-sm">
                          {terminalLabel}
                        </span>
                        <span className="text-muted-foreground hidden truncate font-mono text-[11px] md:block">
                          {terminalSession.id}
                        </span>
                      </span>
                    </button>
                    <Button
                      aria-label={`${terminalAction} ${terminalLabel}`}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={Boolean(killingTerminalId)}
                      size="icon-xs"
                      title={`${terminalAction} ${terminalLabel}`}
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setTerminalPendingKill({
                          id: terminalSession.id,
                          label: terminalLabel,
                        })
                      }
                    >
                      {killingTerminalId === terminalSession.id ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Trash2 />
                      )}
                    </Button>
                  </div>
                );
              })}
              {workspace.terminalSessionIds.length === 0 &&
              workspace.status === "connected" ? (
                <p className="text-muted-foreground px-2 py-4 text-center text-xs">
                  No terminal sessions yet.
                </p>
              ) : null}
              {terminalCreationError ? (
                <p className="text-destructive px-2 py-1 text-xs">
                  {terminalCreationError}
                </p>
              ) : null}
            </div>

            {workspace.tmuxSessions.length > 0 ? (
              <div className="max-h-52 overflow-y-auto border-t p-3 md:max-h-64">
                <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                  Tmux
                </p>
                <div className="max-h-44 space-y-1 overflow-y-auto">
                  {workspace.tmuxSessions.map((tmuxSession) => (
                    <div key={tmuxSession.name} className="text-xs">
                      <button
                        className="hover:bg-muted flex w-full items-center gap-1.5 rounded px-1 py-1 text-left font-mono font-medium disabled:opacity-50"
                        disabled={
                          Boolean(isCreatingTerminal || attachingTmuxTarget) ||
                          workspace.status !== "connected"
                        }
                        title={`Attach to ${tmuxSession.name}`}
                        type="button"
                        onClick={() =>
                          void attachTmuxTerminal({
                            sessionName: tmuxSession.name,
                          })
                        }
                      >
                        {attachingTmuxTarget === tmuxSession.name ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <ChevronRight className="size-3.5" />
                        )}
                        <span className="truncate">{tmuxSession.name}</span>
                      </button>
                      {tmuxSession.windows.length > 0 ? (
                        <ul className="mt-1 space-y-1 pl-5">
                          {tmuxSession.windows.map((tmuxWindow) => (
                            <li key={`${tmuxSession.name}:${tmuxWindow.id}`}>
                              <button
                                className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full min-w-0 items-center gap-1.5 rounded px-1 py-1 text-left font-mono disabled:opacity-50"
                                disabled={
                                  Boolean(
                                    isCreatingTerminal || attachingTmuxTarget,
                                  ) || workspace.status !== "connected"
                                }
                                title={`Attach to ${tmuxSession.name} › ${tmuxWindow.name}`}
                                type="button"
                                onClick={() =>
                                  void attachTmuxTerminal({
                                    sessionName: tmuxSession.name,
                                    windowId: tmuxWindow.id,
                                  })
                                }
                              >
                                {attachingTmuxTarget ===
                                `${tmuxSession.name}:${tmuxWindow.id}` ? (
                                  <LoaderCircle className="size-3 animate-spin" />
                                ) : (
                                  <TerminalIcon className="size-3 shrink-0" />
                                )}
                                <span className="truncate">
                                  {tmuxWindow.name}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <section className="order-1 flex min-h-0 min-w-0 flex-col bg-black md:order-none">
            <div className="bg-background text-foreground flex min-h-10 shrink-0 items-center gap-3 border-b px-3 py-2">
              <div className="ml-auto flex min-w-0 items-center gap-3">
                <span className="truncate text-sm font-medium">
                  {selectedTerminalLabel}
                </span>
                {terminal.latencyMs !== null ? (
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {terminal.latencyMs} ms
                  </span>
                ) : null}
                <ConnectionStatus status={combinedSocketStatus} />
              </div>
            </div>
            <div className="min-h-0 flex-1">
              {selectedTerminalId ? (
                <WebTerminal
                  key={selectedTerminalId}
                  sendInput={terminal.sendInput}
                  sendResize={terminal.sendResize}
                  status={terminal.status}
                  subscribe={terminal.subscribe}
                />
              ) : (
                <div className="text-muted-foreground flex h-full min-h-0 items-center justify-center p-6 text-sm">
                  Select a terminal or create a new one.
                </div>
              )}
            </div>
          </section>
        </main>
      )}
      <TerminalDirectoryDialog
        dirs={workspace.favoriteDirs}
        isCreating={isCreatingTerminal}
        onOpenChange={setIsDirectoryDialogOpen}
        onSelect={(workingDirectory) => void addTerminal(workingDirectory)}
        open={isDirectoryDialogOpen}
      />
      <ConfirmationDialog
        confirmText={
          pendingTerminalSession?.kind === "tmux"
            ? "Detach terminal"
            : "Kill terminal"
        }
        description={
          pendingTerminalSession?.kind === "tmux"
            ? "The web terminal client will be detached. The tmux session and its commands will keep running."
            : "The shell and any running command in this terminal will be stopped."
        }
        isDestructive
        onConfirm={() => {
          if (terminalPendingKill) {
            void killTerminal(terminalPendingKill.id);
          }
        }}
        onOpenChange={(open) => {
          if (!open && !killingTerminalId) setTerminalPendingKill(null);
        }}
        open={terminalPendingKill !== null}
        title={`${
          pendingTerminalSession?.kind === "tmux" ? "Detach" : "Kill"
        } ${terminalPendingKill?.label ?? "terminal"}?`}
      />
    </div>
  );
}

function ConnectionStatus({
  className,
  status,
}: {
  className?: string;
  status: "connecting" | "connected" | "disconnected" | "error";
}) {
  const color =
    status === "connected"
      ? "bg-emerald-500"
      : status === "connecting"
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <span
      className={className}
      aria-label={`Workspace and terminal sockets: ${status}`}
      title={`Workspace and terminal sockets: ${status}`}
    >
      <span className={`size-2 rounded-full ${color}`} />
    </span>
  );
}

function PageState({
  loading = false,
  message,
}: {
  loading?: boolean;
  message: string;
}) {
  return (
    <div className="text-muted-foreground flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
      {loading ? (
        <LoaderCircle className="size-5 animate-spin" />
      ) : (
        <TerminalIcon className="size-6" />
      )}
      <p>{message}</p>
    </div>
  );
}
