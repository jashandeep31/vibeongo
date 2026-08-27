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
import { useEffect, useMemo, useState } from "react";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { TerminalDirectoryDialog } from "@/components/terminal-directory-dialog";
import { WebTerminal } from "@/components/web-terminal";
import { useWebTerminalSessionSocket } from "@/hooks/use-web-terminal-session-socket";
import { useWebTerminalWorkspaceSocket } from "@/hooks/use-web-terminal-workspace-socket";
import {
  createWebTerminalSession,
  killWebTerminalSession,
} from "@/lib/web-terminal-socket";

function getLocalToken(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  const token = (config as Record<string, unknown>).vibeongoLocalToken;
  return typeof token === "string" ? token : "";
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
    if (isCreatingTerminal) return;
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

  const selectedTerminalLabel = useMemo(() => {
    if (isCreatingTerminal) return "Creating terminal…";
    const index = workspace.terminalSessionIds.indexOf(selectedTerminalId);
    return index >= 0 ? `Terminal ${index + 1}` : "Terminal";
  }, [isCreatingTerminal, selectedTerminalId, workspace.terminalSessionIds]);

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
                  isCreatingTerminal || workspace.status !== "connected"
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
              {workspace.terminalSessionIds.map((terminalId, index) => {
                const selected = terminalId === selectedTerminalId;
                const terminalLabel = `Terminal ${index + 1}`;
                return (
                  <div
                    key={terminalId}
                    className={`flex min-w-max shrink-0 items-center rounded-md border p-1 transition-colors md:min-w-0 md:rounded-lg ${
                      selected
                        ? "border-primary/40 bg-primary/10"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    <button
                      className="flex min-w-0 flex-1 items-center gap-1.5 px-1 py-0.5 text-left md:gap-2 md:px-2 md:py-1"
                      type="button"
                      onClick={() => setSelectedTerminalId(terminalId)}
                    >
                      <TerminalIcon className="size-3.5 shrink-0 md:size-4" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium md:text-sm">
                          {terminalLabel}
                        </span>
                        <span className="text-muted-foreground hidden truncate font-mono text-[11px] md:block">
                          {terminalId}
                        </span>
                      </span>
                    </button>
                    <Button
                      aria-label={`Kill ${terminalLabel}`}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={Boolean(killingTerminalId)}
                      size="icon-xs"
                      title={`Kill ${terminalLabel}`}
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setTerminalPendingKill({
                          id: terminalId,
                          label: terminalLabel,
                        })
                      }
                    >
                      {killingTerminalId === terminalId ? (
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
              <div className="hidden border-t p-3 md:block">
                <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                  Tmux
                </p>
                <div className="max-h-44 space-y-1 overflow-y-auto">
                  {workspace.tmuxSessions.map((tmuxSession) => (
                    <div key={tmuxSession.name} className="text-xs">
                      <div className="flex items-center gap-1.5 py-1 font-mono font-medium">
                        <ChevronRight className="size-3.5" />
                        {tmuxSession.name}
                      </div>
                      <p className="text-muted-foreground pl-5">
                        {tmuxSession.windows.length}{" "}
                        {tmuxSession.windows.length === 1
                          ? "window"
                          : "windows"}
                      </p>
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
        confirmText="Kill terminal"
        description="The shell and any running command in this terminal will be stopped."
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
        title={`Kill ${terminalPendingKill?.label ?? "terminal"}?`}
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
