"use client";

import { useGetInstances } from "@repo/api-hooks";
import { useSessionsStore } from "@repo/app-store";
import { Button } from "@repo/ui/components/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@repo/ui/components/resizable";
import {
  ChevronRight,
  FolderOpen,
  LoaderCircle,
  Plus,
  Settings,
  Terminal as TerminalIcon,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import { RuntimePulseMenu } from "@/components/runtime-pulse-menu";
import { useRuntimeSession } from "@/components/runtime-session-provider";
import { TerminalDirectoryDialog, TerminalDirectoryList } from "@/components/terminal-directory-dialog";
import { WebTerminal } from "@/components/web-terminal";
import { useWebTerminalSessionSocket } from "@/hooks/use-web-terminal-session-socket";
import { type WebTerminalSession } from "@/hooks/use-web-terminal-workspace-socket";
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

export function ProjectTerminalWorkspace({
  projectId,
  projectSessionId,
  mode = "page",
  isActive = true,
  onClose,
}: {
  projectId: string;
  projectSessionId: string;
  mode?: "page" | "panel";
  isActive?: boolean;
  onClose?: () => void;
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
    isActive && !sessionEntry?.instance,
  );
  const instance = sessionEntry?.instance ?? instancesQuery.data?.data[0];
  const runtimeUrl = instance
    ? `https://3101-${instance.id}${instance.proxy_domain}`
    : "";
  const localToken = getLocalToken(instance?.config);
  const accessToken = instance?.access_token ?? "";
  const socketsEnabled = Boolean(runtimeUrl && localToken && accessToken);

  const workspace = useRuntimeSession();
  const terminal = useWebTerminalSessionSocket({
    accessToken,
    enabled: isActive && socketsEnabled && Boolean(selectedTerminalId),
    localToken,
    runtimeUrl,
    sessionId: selectedTerminalId,
  });

  useEffect(() => {
    if (pendingTerminalId && selectedTerminalId === pendingTerminalId) return;
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
    <div className={`bg-background text-foreground flex ${mode === "panel" ? "h-full" : "h-svh"} min-h-0 w-full flex-col`}>
      {mode === "panel" ? (
        <header className="flex h-10 shrink-0 items-center gap-2 border-b px-2">
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium">Terminals</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="New terminal"
            title="New terminal"
            disabled={!socketsEnabled || isCreatingTerminal || Boolean(attachingTmuxTarget) || workspace.status !== "connected"}
            onClick={() => {
              setTerminalCreationError("");
              setIsDirectoryDialogOpen(true);
            }}
          >
            {isCreatingTerminal ? <LoaderCircle className="animate-spin" /> : <Plus />}
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Close terminals panel" title="Close terminals panel" onClick={onClose}>
            <X />
          </Button>
        </header>
      ) : null}
      {isLoading ? (
        <PageState loading message="Loading terminal runtime…" />
      ) : errorMessage ? (
        <PageState message={errorMessage} />
      ) : (
        <main className="flex min-h-0 flex-1">
          <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel id="terminal-tree" defaultSize={mode === "panel" ? "30%" : "22%"} minSize="96px" maxSize="60%">
          <aside className="bg-muted/10 flex h-full min-h-0 min-w-0 flex-col overflow-y-auto">
            <div className={mode === "panel" ? "flex min-w-0 shrink-0 flex-col gap-0.5 p-1.5" : "flex min-w-0 shrink-0 flex-col gap-2 p-2"}>
              {mode === "page" ? (
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
              ) : null}
              {workspace.terminalSessions.map((terminalSession) => {
                const selected = terminalSession.id === selectedTerminalId;
                const terminalLabel = getTerminalSessionLabel(terminalSession);
                const terminalAction =
                  terminalSession.kind === "tmux" ? "Detach" : "Kill";
                return (
                  <div
                    key={terminalSession.id}
                    className={mode === "panel" ? `group flex min-w-0 items-center rounded-md ${selected ? "bg-muted" : "hover:bg-muted/70"}` : `flex min-w-max shrink-0 items-center rounded-md border p-1 transition-colors md:min-w-0 md:rounded-lg ${
                      selected
                        ? "border-primary/40 bg-primary/10"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    <button
                      className={mode === "panel" ? "flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-2 text-left" : "flex min-w-0 flex-1 items-center gap-1.5 px-1 py-0.5 text-left md:gap-2 md:px-2 md:py-1"}
                      type="button"
                      aria-pressed={selected}
                      title={terminalLabel}
                      onClick={() => setSelectedTerminalId(terminalSession.id)}
                    >
                      <TerminalIcon className="size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className={mode === "panel" ? "block truncate text-xs" : "block text-xs font-medium md:text-sm"}>
                          {terminalLabel}
                        </span>
                        {mode === "page" ? <span className="text-muted-foreground hidden truncate font-mono text-[11px] md:block">
                          {terminalSession.id}
                        </span> : null}
                      </span>
                    </button>
                    <Button
                      aria-label={`${terminalAction} ${terminalLabel}`}
                      className={mode === "panel" ? "text-muted-foreground hover:text-destructive shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100" : "text-destructive hover:bg-destructive/10 hover:text-destructive"}
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
              <div className={mode === "panel" ? "shrink-0 border-t p-1.5" : "max-h-52 overflow-y-auto border-t p-3 md:max-h-64"}>
                <p className="text-muted-foreground mb-1 px-1 text-xs">
                  Tmux
                </p>
                <div className={mode === "panel" ? "space-y-0.5" : "max-h-44 space-y-1 overflow-y-auto"}>
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
          </ResizablePanel>
          <ResizableHandle aria-label="Resize terminal tree and console" className="hover:bg-ring" />
          <ResizablePanel id="terminal-console" defaultSize={mode === "panel" ? "70%" : "78%"} minSize="100px">
          <section className="flex h-full min-h-0 min-w-0 flex-col bg-black">
            <div className="bg-background text-foreground flex h-10 shrink-0 items-center gap-2 border-b px-2">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="truncate text-sm font-medium">
                  {selectedTerminalLabel}
                </span>
                {mode === "page" && terminal.latencyMs !== null ? (
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {terminal.latencyMs}ms
                  </span>
                ) : null}
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <ConnectionStatus status={combinedSocketStatus} />
                  {mode === "page" ? <>
                  <Button asChild size="icon-sm" variant="outline">
                    <Link
                      href={`/projects/${projectId}/sessions/${projectSessionId}/files`}
                      aria-label="Open files"
                      title="Open files"
                    >
                      <FolderOpen />
                    </Link>
                  </Button>
                  <RuntimePulseMenu projectSessionId={projectSessionId} />
                  <ProjectDomainsDialog
                    projectId={projectId}
                    projectSessionId={projectSessionId}
                    iconOnly
                  />
                  <Button asChild size="icon-sm" variant="outline">
                    <Link
                      href={`/projects/${projectId}/sessions/${projectSessionId}/settings`}
                      aria-label="Session settings"
                      title="Session settings"
                    >
                      <Settings />
                    </Link>
                  </Button>
                  </> : null}
                </div>
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
                <div className="bg-background h-full min-h-0 overflow-y-auto p-3">
                  <div className="mx-auto w-full max-w-sm py-3" aria-busy={isCreatingTerminal}>
                    <h3 className="mb-2 flex items-center gap-2 px-2 text-sm font-medium">
                      {isCreatingTerminal ? <LoaderCircle className="size-4 animate-spin" /> : null}
                      {isCreatingTerminal ? "Opening terminal…" : "Open terminal in"}
                    </h3>
                    <TerminalDirectoryList
                      dirs={workspace.favoriteDirs}
                      disabled={!isActive || !socketsEnabled || isCreatingTerminal || Boolean(attachingTmuxTarget) || workspace.status !== "connected"}
                      onSelect={(workingDirectory) => void addTerminal(workingDirectory)}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
          </ResizablePanel>
          </ResizablePanelGroup>
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
      <span className={`block size-2 rounded-full ${color}`} />
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
