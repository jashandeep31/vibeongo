"use client";

import {
  WorkComposer,
  type WorkComposerSubmitPayload,
} from "@/components/work-composer";
import {
  ProjectSessionRuntimeDialog,
  type ProjectSessionRuntime,
} from "@/components/dialogs/project-session-runtime-dialog";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { CreateProjectSessionDialog } from "@/components/dialogs/create-project-session-dialog";
import { GithubRepoDirectoryDialog } from "@/components/dialogs/github-repo-directory-dialog";
import { useTerminateInstance } from "@/hooks/use-instance";
import { useDeleteChat, useGetVibeongoChats } from "@/hooks/use-chats";
import { useGetProjectGithubReposById } from "@/hooks/use-project";
import { useAuthenticatedUser } from "@/hooks/use-user";
import { useWebSocket } from "@/hooks/use-websocket";
import { LOW_BALANCE_THRESHOLD } from "@/lib/constants";
import type { Chat } from "@/services/chat-services";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import {
  Archive,
  BotMessageSquare,
  ChevronDown,
  Clock3,
  Ellipsis,
  FolderKanban,
  Loader2,
  Play,
  Plus,
  TriangleAlert,
  Trash2,
  X,
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
  const router = useRouter();
  const { data: user } = useAuthenticatedUser();
  const { isConnected, sendJsonMessage, subscribeJsonMessage } = useWebSocket();
  const {
    data: recentChats = [],
    isPending: areChatsPending,
    isError: areChatsError,
  } = useGetVibeongoChats(5);
  const projects = useProjectsStore((store) => store.projects);
  const sessions = useSessionsStore((store) => store.sessions);
  const resumeSession = useResumeProjectSession();
  const archiveSession = useArchiveProjectSession();
  const deleteChat = useDeleteChat();
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [runtimeDialogSessionId, setRuntimeDialogSessionId] = useState<
    string | null
  >(null);
  const [resumingSessionId, setResumingSessionId] = useState<string | null>(
    null,
  );
  const [archivingSessionId, setArchivingSessionId] = useState<string | null>(
    null,
  );
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [activeTab, setActiveTab] = useState("chats");
  const isBalanceLow = user && user.balance < LOW_BALANCE_THRESHOLD;
  const hasNoBalance = user && user.balance <= 0;

  useEffect(
    () =>
      subscribeJsonMessage((message) => {
        if (
          message.type === "new-chat" &&
          typeof message.data === "object" &&
          message.data !== null &&
          "chatId" in message.data &&
          typeof message.data.chatId === "string"
        ) {
          router.push(`/chat/${message.data.chatId}`);
          return;
        }

        if (message.type === "error") {
          setIsCreatingChat(false);
          toast.error("Could not create the chat");
        }
      }),
    [router, subscribeJsonMessage],
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

  const handleDeleteChat = () => {
    if (!chatToDelete) return;

    const chatId = chatToDelete.id;
    setChatToDelete(null);
    deleteChat.mutate(chatId, {
      onSuccess: () => toast.success("Chat deleted"),
      onError: () => toast.error("Failed to delete chat"),
    });
  };

  const handleCreateChat = (payload: WorkComposerSubmitPayload) => {
    if (!payload.message.trim() || isCreatingChat) return false;

    const sent = sendJsonMessage({
      type: "new-chat",
      data: {
        question: payload.message,
        payload: {
          mentions: payload.tagged.map((tag) => ({
            type: tag.type,
            id: tag.data.id,
            name: tag.data.name,
          })),
        },
      },
    });

    if (!sent) {
      toast.error("Chat service is still connecting. Please try again.");
      return false;
    }

    setIsCreatingChat(true);
    return true;
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:pt-32">
      <div>
        <WorkComposer
          onSubmit={handleCreateChat}
          disabled={!isConnected}
          isSubmitting={isCreatingChat}
          autoFocus
          focusOnTyping
        />
        {isBalanceLow ? (
          <div
            role="alert"
            className={`relative z-0 mx-7 -mt-3 flex min-h-12 items-center justify-between gap-3 rounded-b-2xl px-4 pt-5 pb-3 text-sm ${
              hasNoBalance
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <TriangleAlert className="size-4 shrink-0" />
              <span>
                {hasNoBalance
                  ? "No credits remaining. Add credits to continue using AI."
                  : "Your wallet balance is low."}
              </span>
            </span>
            <Link
              href="/wallet"
              className="shrink-0 font-medium underline underline-offset-4"
            >
              Add credits
            </Link>
          </div>
        ) : null}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-10 flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-3">
          <TabsList
            aria-label="Browse workspace"
            className="bg-muted/60 h-9 rounded-full border p-1 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <TabsTrigger
              value="chats"
              className="data-active:bg-primary data-active:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-active:!bg-primary dark:data-active:!text-primary-foreground dark:data-[state=active]:!bg-primary dark:data-[state=active]:!text-primary-foreground h-7 flex-none rounded-full px-3 text-sm data-active:shadow-sm data-[state=active]:shadow-sm"
            >
              <BotMessageSquare className="size-3.5" />
              Chats
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="data-active:bg-primary data-active:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-active:!bg-primary dark:data-active:!text-primary-foreground dark:data-[state=active]:!bg-primary dark:data-[state=active]:!text-primary-foreground h-7 flex-none rounded-full px-3 text-sm data-active:shadow-sm data-[state=active]:shadow-sm"
            >
              <FolderKanban className="size-3.5" />
              Projects
            </TabsTrigger>
          </TabsList>

          {activeTab === "projects" && (
            <Button asChild size="sm">
              <Link href="/projects/create">
                <Plus />
                Create project
              </Link>
            </Button>
          )}
        </div>

        <TabsContent value="chats">
          <section aria-label="Recent chats">
            {areChatsPending ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Loading chats…
              </div>
            ) : areChatsError ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                Could not load recent chats.
              </p>
            ) : recentChats.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                No recent chats.
              </p>
            ) : (
              <div className="space-y-1">
                {recentChats.map((chat) => {
                  const isDeleting =
                    deleteChat.isPending && deleteChat.variables === chat.id;

                  return (
                    <div
                      key={chat.id}
                      className="group flex w-full items-center gap-1"
                    >
                      <Link
                        href={`/chat/${chat.id}`}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 px-1 py-3 text-left"
                      >
                        <BotMessageSquare className="text-muted-foreground group-hover:text-foreground size-5 shrink-0 transition-colors" />
                        <span className="text-muted-foreground group-hover:text-foreground min-w-0 truncate text-base transition-colors">
                          {chat.name}
                        </span>
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                        aria-label={`Delete ${chat.name}`}
                        title={`Delete ${chat.name}`}
                        disabled={deleteChat.isPending}
                        onClick={() => setChatToDelete(chat)}
                      >
                        {isDeleting ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <X />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="projects">
          <section aria-label="Projects">
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
        </TabsContent>
      </Tabs>

      <ProjectSessionRuntimeDialog
        open={runtimeDialogSessionId !== null}
        onOpenChange={(open) => {
          if (!open) setRuntimeDialogSessionId(null);
        }}
        onSelect={handleRuntimeSelect}
      />
      <ConfirmationDialog
        open={chatToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setChatToDelete(null);
        }}
        title="Delete chat?"
        description={
          chatToDelete
            ? `Delete "${chatToDelete.name}"? This cannot be undone.`
            : "This cannot be undone."
        }
        confirmText="Delete chat"
        isDestructive
        onConfirm={handleDeleteChat}
      />
    </div>
  );
}
