"use client";

import {
  ProjectSessionRuntimeDialog,
  type ProjectSessionRuntime,
} from "@/components/dialogs/project-session-runtime-dialog";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { CreateProjectSessionDialog } from "@/components/dialogs/create-project-session-dialog";
import { GithubRepoDirectoryDialog } from "@/components/dialogs/github-repo-directory-dialog";
import { useTerminateInstance } from "@/hooks/use-instance";
import { useGetProjectGithubReposById } from "@/hooks/use-project";
import {
  useArchiveProjectSession,
  useResumeProjectSession,
} from "@/hooks/use-project-sessions";
import {
  useProjectsStore,
  useSessionChatsStore,
  useSessionsStore,
} from "@/store/playground-store";
import { Button } from "@repo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Archive,
  BotMessageSquare,
  ChevronDown,
  Clock3,
  Ellipsis,
  Loader2,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type SessionEntry = ReturnType<
  typeof useSessionsStore.getState
>["sessions"][number];

function getRepoDirectory(fullName: string) {
  const repoName = fullName.split("/").filter(Boolean).at(-1) ?? fullName;
  return `/home/ubuntu/code/${repoName}`;
}

function getRunningSessionUrl(entry: SessionEntry, directory: string) {
  if (!entry.instance) return null;

  const serverUrl = `https://4096-${entry.instance.id}${entry.instance.proxy_domain}`;
  const params = new URLSearchParams({ serverUrl, directory });
  return `/projects/${entry.session.project_id}/chats/${entry.session.id}?${params.toString()}`;
}

function getServerUrl(entry: SessionEntry) {
  if (!entry.instance || entry.state !== "running") return "";
  return `https://4096-${entry.instance.id}${entry.instance.proxy_domain}`;
}

function formatTimeRemaining(terminatesAt: string, now: number) {
  const remainingMs = new Date(terminatesAt).getTime() - now;
  if (!Number.isFinite(remainingMs)) return "N/A";
  if (remainingMs <= 0) return "Expired";

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function SessionRow({
  entry,
  isResumePending,
  isArchivePending,
  onResume,
  onArchive,
}: {
  entry: SessionEntry;
  isResumePending: boolean;
  isArchivePending: boolean;
  onResume: (sessionId: string) => void;
  onArchive: (sessionId: string) => void;
}) {
  const router = useRouter();
  const [isRepoDialogOpen, setIsRepoDialogOpen] = useState(false);
  const [isStartingNewChat, setIsStartingNewChat] = useState(false);
  const [isArchiveConfirmationOpen, setIsArchiveConfirmationOpen] =
    useState(false);
  const [isTerminationConfirmationOpen, setIsTerminationConfirmationOpen] =
    useState(false);
  const [isInstanceMenuOpen, setIsInstanceMenuOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const serverUrl = getServerUrl(entry);
  const chatUrl = `/projects/${entry.session.project_id}/chats/${entry.session.id}`;
  const storedOpencodeSessions = useSessionChatsStore(
    (store) => store.chatsBySessionId[entry.session.id],
  );
  const opencodeSessions = storedOpencodeSessions ?? [];
  const terminateInstance = useTerminateInstance(
    entry.session.project_id,
    entry.session.id,
  );
  const {
    data: githubRepos,
    isPending: isReposPending,
    isError: isReposError,
    refetch: refetchGithubRepos,
  } = useGetProjectGithubReposById(entry.session.project_id, isRepoDialogOpen);

  useEffect(() => {
    if (!isInstanceMenuOpen) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isInstanceMenuOpen]);

  const openDirectory = (directory: string) => {
    const runningUrl = getRunningSessionUrl(entry, directory);
    if (!runningUrl) return;

    setIsRepoDialogOpen(false);
    router.push(runningUrl);
  };

  const handleNewChat = async () => {
    setIsStartingNewChat(true);

    const result = await refetchGithubRepos();
    const repos = result.data ?? [];
    const [onlyRepo] = repos;

    if (result.isSuccess && repos.length === 1 && onlyRepo) {
      openDirectory(getRepoDirectory(onlyRepo.full_name));
    } else {
      setIsRepoDialogOpen(true);
    }

    setIsStartingNewChat(false);
  };

  return (
    <>
      <Collapsible
        defaultOpen={entry.state === "running"}
        className="group/session bg-muted/40 overflow-hidden rounded-lg"
      >
        <div className="flex items-center gap-2 px-2 py-2">
          <CollapsibleTrigger asChild disabled={!serverUrl}>
            <button
              type="button"
              className="hover:bg-muted/60 flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-default disabled:hover:bg-transparent"
            >
              <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]/session:-rotate-90" />
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-sm font-medium"
                  title={entry.session.name}
                >
                  {entry.session.name}
                </span>
              </span>
              <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
                <span
                  className={`size-1.5 rounded-full ${
                    entry.state === "running"
                      ? "bg-emerald-500"
                      : entry.state === "processing"
                        ? "animate-pulse bg-amber-500"
                        : "bg-muted-foreground/50"
                  }`}
                />
                {entry.state === "running"
                  ? "Running"
                  : entry.state === "processing"
                    ? "Starting"
                    : "Paused"}
              </span>
            </button>
          </CollapsibleTrigger>

          {entry.instance ? (
            <DropdownMenu
              open={isInstanceMenuOpen}
              onOpenChange={(open) => {
                setIsInstanceMenuOpen(open);
                if (open) setNow(Date.now());
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Instance controls for ${entry.session.name}`}
                  disabled={terminateInstance.isPending}
                >
                  {terminateInstance.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Ellipsis />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Instance controls</DropdownMenuLabel>
                <div className="flex items-center gap-2 px-1.5 py-2">
                  <Clock3 className="text-muted-foreground size-4" />
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Terminates in
                    </p>
                    <p className="font-mono text-sm font-medium tabular-nums">
                      {formatTimeRemaining(
                        String(entry.instance.terminates_at),
                        now,
                      )}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setIsTerminationConfirmationOpen(true)}
                >
                  <Trash2 />
                  Terminate now
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : entry.state === "stopped" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isResumePending || isArchivePending}
                onClick={() => onResume(entry.session.id)}
              >
                {isResumePending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Play />
                )}
                Resume
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`More options for ${entry.session.name}`}
                    disabled={isArchivePending}
                  >
                    {isArchivePending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Ellipsis />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => setIsArchiveConfirmationOpen(true)}
                  >
                    <Archive />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button disabled variant="ghost" size="sm">
              <Loader2 className="animate-spin" />
              Starting
            </Button>
          )}
        </div>

        {serverUrl ? (
          <CollapsibleContent>
            <div className="border-border/60 space-y-1 border-t px-3 py-3">
              {opencodeSessions.map((opencodeSession) => {
                const params = new URLSearchParams({ serverUrl });
                const url = `${chatUrl}/sessions/${encodeURIComponent(opencodeSession.id)}?${params.toString()}`;

                return (
                  <Button
                    key={opencodeSession.id}
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Link href={url}>
                      <BotMessageSquare />
                      <span
                        className="min-w-0 truncate"
                        title={opencodeSession.title}
                      >
                        {opencodeSession.title}
                      </span>
                    </Link>
                  </Button>
                );
              })}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                disabled={isStartingNewChat}
                onClick={handleNewChat}
              >
                {isStartingNewChat ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Plus />
                )}
                New chat
              </Button>
            </div>
          </CollapsibleContent>
        ) : null}
      </Collapsible>

      <ConfirmationDialog
        open={isArchiveConfirmationOpen}
        onOpenChange={setIsArchiveConfirmationOpen}
        title="Archive session?"
        description={`Archive "${entry.session.name}"? It will be hidden from your active sessions list.`}
        confirmText="Archive"
        onConfirm={() => {
          setIsArchiveConfirmationOpen(false);
          onArchive(entry.session.id);
        }}
      />
      <ConfirmationDialog
        open={isTerminationConfirmationOpen}
        onOpenChange={setIsTerminationConfirmationOpen}
        title="Terminate this instance?"
        description="The running session instance will be terminated immediately. Any unsaved work on the instance may be lost."
        confirmText="Terminate now"
        isDestructive
        onConfirm={() => {
          if (!entry.instance) return;
          setIsTerminationConfirmationOpen(false);
          terminateInstance.mutate(entry.instance.id);
        }}
      />
      <GithubRepoDirectoryDialog
        open={isRepoDialogOpen}
        onOpenChange={setIsRepoDialogOpen}
        repos={githubRepos ?? []}
        isLoading={isReposPending}
        isError={isReposError}
        onSelect={openDirectory}
      />
    </>
  );
}

export default function ClientView() {
  const projects = useProjectsStore((store) => store.projects);
  const sessions = useSessionsStore((store) => store.sessions);
  const resumeSession = useResumeProjectSession();
  const archiveSession = useArchiveProjectSession();
  const [runtimeDialogSessionId, setRuntimeDialogSessionId] = useState<
    string | null
  >(null);
  const [resumingSessionId, setResumingSessionId] = useState<string | null>(
    null,
  );
  const [archivingSessionId, setArchivingSessionId] = useState<string | null>(
    null,
  );

  const handleRuntimeSelect = (runtime: ProjectSessionRuntime) => {
    if (!runtimeDialogSessionId) return;

    const sessionId = runtimeDialogSessionId;
    setRuntimeDialogSessionId(null);
    setResumingSessionId(sessionId);
    resumeSession.mutate(
      { id: sessionId, runtime },
      {
        onSuccess: () => toast.success("Session is starting"),
        onError: () => toast.error("Failed to resume session"),
        onSettled: () => setResumingSessionId(null),
      },
    );
  };

  const handleArchive = (sessionId: string) => {
    setArchivingSessionId(sessionId);
    archiveSession.mutate(
      { id: sessionId, action: true },
      {
        onSuccess: () => toast.success("Session archived"),
        onError: () => toast.error("Failed to archive session"),
        onSettled: () => setArchivingSessionId(null),
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Playground
        </h1>
      </header>

      <section className="mt-8" aria-labelledby="agent-heading">
        <button
          type="button"
          disabled
          className="bg-muted/50 flex w-full cursor-not-allowed items-center justify-between gap-4 rounded-lg px-4 py-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span id="agent-heading" className="block text-sm font-medium">
              VibeOnGo agent
            </span>
          </span>
          <span className="text-muted-foreground shrink-0 text-xs">
            Coming soon
          </span>
        </button>
      </section>

      <section className="mt-12" aria-labelledby="projects-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="projects-heading" className="text-base font-semibold">
              Your projects
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild size="sm">
              <Link href="/projects/create">
                <Plus />
                Create project
              </Link>
            </Button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="bg-muted/40 rounded-lg px-4 py-10 text-center">
            <p className="text-sm font-medium">No projects yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Your projects and sessions will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => {
              const projectSessions = sessions.filter(
                (entry) => entry.session.project_id === project.id,
              );
              const runningCount = projectSessions.filter(
                (entry) => entry.state === "running",
              ).length;
              return (
                <Collapsible
                  key={project.id}
                  defaultOpen={projects.length === 1}
                >
                  <div className="bg-muted/25 overflow-hidden rounded-lg">
                    <div className="flex items-center pr-2">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="hover:bg-muted/50 group flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">
                                {project.name}
                              </span>
                              {runningCount > 0 ? (
                                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                  <span className="size-1.5 rounded-full bg-emerald-500" />
                                  {runningCount} running
                                </span>
                              ) : null}
                            </span>
                          </span>
                          <span className="text-muted-foreground hidden shrink-0 text-sm sm:block">
                            {projectSessions.length}{" "}
                            {projectSessions.length === 1
                              ? "session"
                              : "sessions"}
                          </span>
                          <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                        </button>
                      </CollapsibleTrigger>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${project.name}`}
                          >
                            <Ellipsis />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <CreateProjectSessionDialog
                            projectId={project.id}
                            projectName={project.name}
                          >
                            <DropdownMenuItem
                              onSelect={(event) => event.preventDefault()}
                            >
                              <Plus />
                              New session
                            </DropdownMenuItem>
                          </CreateProjectSessionDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <CollapsibleContent>
                      <div className="space-y-2 px-3 pb-3">
                        {projectSessions.length === 0 ? (
                          <div className="text-muted-foreground px-3 py-6 text-center text-sm">
                            This project does not have any sessions yet.
                          </div>
                        ) : (
                          projectSessions.map((entry) => (
                            <SessionRow
                              key={entry.session.id}
                              entry={entry}
                              isResumePending={
                                resumingSessionId === entry.session.id
                              }
                              isArchivePending={
                                archivingSessionId === entry.session.id
                              }
                              onResume={setRuntimeDialogSessionId}
                              onArchive={handleArchive}
                            />
                          ))
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </section>

      <ProjectSessionRuntimeDialog
        open={runtimeDialogSessionId !== null}
        onOpenChange={(open) => {
          if (!open) setRuntimeDialogSessionId(null);
        }}
        onSelect={handleRuntimeSelect}
      />
    </div>
  );
}
