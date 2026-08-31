"use client";

import { AutomatedSessionBadge } from "@/components/automated-session-badge";
import {
  WorkComposer,
  type WorkComposerSubmitPayload,
} from "@/components/work-composer";
import {
  ProjectSessionRuntimeDialog,
  type ProjectSessionRuntime,
} from "@/components/dialogs/project-session-runtime-dialog";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { GithubRepoDirectoryDialog } from "@/components/dialogs/github-repo-directory-dialog";
import {
  InstanceControlsDropdown,
  ProjectActionsDropdown,
  SessionActionsDropdown,
} from "@/components/project-action-menus";
import { useGetProjectGithubReposById } from "@repo/api-hooks";
import { useAuthenticatedUser } from "@repo/api-hooks";
import { useWebSocket } from "@repo/api-hooks";
import { LOW_BALANCE_THRESHOLD } from "@/lib/constants";
import {
  isWorkspaceView,
  WORKSPACE_VIEW_CHANGE_EVENT,
  type WorkspaceView,
} from "@/lib/workspace-view";
import {
  useArchiveProjectSession,
  useResumeProjectSession,
} from "@repo/api-hooks";
import type { Chat } from "@repo/api-client";
import { useDeleteChat, useGetVibeongoChats } from "@repo/api-hooks";
import {
  useProjectsStore,
  useSessionChatsStore,
  useSessionsStore,
} from "@repo/app-store";
import { Button } from "@repo/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import {
  BotMessageSquare,
  ChevronRight,
  FolderKanban,
  Loader2,
  Play,
  Plus,
  Terminal,
  TriangleAlert,
  X,
} from "lucide-react";
import axios from "axios";
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

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
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
  const serverUrl = getServerUrl(entry);
  const chatUrl = `/projects/${entry.session.project_id}/chats/${entry.session.id}`;
  const storedOpencodeSessions = useSessionChatsStore(
    (store) => store.chatsBySessionId[entry.session.id],
  );
  const opencodeSessions = storedOpencodeSessions ?? [];
  const {
    data: githubRepos,
    isPending: isReposPending,
    isError: isReposError,
    refetch: refetchGithubRepos,
  } = useGetProjectGithubReposById(entry.session.project_id, isRepoDialogOpen);

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
      <div>
        <div className="flex items-center gap-2 py-1">
          <div className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left">
            <ChevronRight
              className={`text-muted-foreground size-4 shrink-0 ${
                serverUrl ? "rotate-90" : ""
              }`}
            />
            <span className="min-w-0 flex-1">
              <span
                className="text-muted-foreground block truncate font-mono text-sm font-semibold capitalize"
                title={entry.session.name}
              >
                {entry.session.name}
              </span>
            </span>
            {entry.session.category === "auto" ? (
              <AutomatedSessionBadge />
            ) : null}
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
            </span>
          </div>

          {entry.instance ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="icon-sm"
                aria-label={`Open terminal for ${entry.session.name}`}
                title="Open terminal"
              >
                <Link href={`${chatUrl}/terminal`}>
                  <Terminal />
                </Link>
              </Button>
              <InstanceControlsDropdown
                instance={entry.instance}
                projectId={entry.session.project_id}
                sessionId={entry.session.id}
                sessionName={entry.session.name}
              />
            </>
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
              </Button>
              <SessionActionsDropdown
                sessionName={entry.session.name}
                isArchivePending={isArchivePending}
                onArchive={() => onArchive(entry.session.id)}
              />
            </>
          ) : (
            <Button disabled variant="ghost" size="sm">
              <Loader2 className="animate-spin" />
              Starting
            </Button>
          )}
        </div>

        {serverUrl ? (
          <div className="space-y-1 py-3 pl-7">
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
        ) : null}
      </div>

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
  const [activeTab, setActiveTab] = useState<WorkspaceView>("projects");
  const isBalanceLow = user && user.balance < LOW_BALANCE_THRESHOLD;
  const hasNoBalance = user && user.balance <= 0;

  useEffect(() => {
    const syncViewFromUrl = () => {
      const requestedView = new URLSearchParams(window.location.search).get(
        "view",
      );

      setActiveTab(isWorkspaceView(requestedView) ? requestedView : "projects");
    };

    syncViewFromUrl();

    const handleWorkspaceViewChange = (event: Event) => {
      if (event instanceof CustomEvent && isWorkspaceView(event.detail)) {
        setActiveTab(event.detail);
      }
    };

    window.addEventListener(
      WORKSPACE_VIEW_CHANGE_EVENT,
      handleWorkspaceViewChange,
    );
    window.addEventListener("popstate", syncViewFromUrl);

    return () => {
      window.removeEventListener(
        WORKSPACE_VIEW_CHANGE_EVENT,
        handleWorkspaceViewChange,
      );
      window.removeEventListener("popstate", syncViewFromUrl);
    };
  }, []);

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
        onError: (error) =>
          toast.error(getErrorMessage(error, "Failed to resume session")),
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

  const handleViewChange = (view: string) => {
    if (view !== "chats" && view !== "projects") return;

    setActiveTab(view);
    router.replace(`/?view=${view}`, { scroll: false });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-5 pb-12 sm:px-8 sm:pb-16">
      <Tabs
        value={activeTab}
        onValueChange={handleViewChange}
        className="flex-col gap-[50px] sm:gap-16 lg:gap-[72px]"
      >
        <div className="flex items-center justify-center">
          <TabsList
            aria-label="Browse workspace"
            className="bg-muted/60 h-11 rounded-full border p-1 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <TabsTrigger
              value="chats"
              className="data-active:bg-primary data-active:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-active:!bg-primary dark:data-active:!text-primary-foreground dark:data-[state=active]:!bg-primary dark:data-[state=active]:!text-primary-foreground h-9 flex-none rounded-full px-4 text-sm data-active:shadow-sm data-[state=active]:shadow-sm"
            >
              <BotMessageSquare className="size-4" />
              Chats
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="data-active:bg-primary data-active:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-active:!bg-primary dark:data-active:!text-primary-foreground dark:data-[state=active]:!bg-primary dark:data-[state=active]:!text-primary-foreground h-9 flex-none rounded-full px-4 text-sm data-active:shadow-sm data-[state=active]:shadow-sm"
            >
              <FolderKanban className="size-4" />
              Projects
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chats">
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

          <section aria-label="Recent chats" className="mt-6">
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
          <div className="mb-4 flex justify-end">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="bg-background/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground h-8 rounded-md px-3 font-mono text-xs tracking-wide uppercase shadow-none"
            >
              <Link href="/projects/create">
                <Plus className="size-3.5" />
                New project
              </Link>
            </Button>
          </div>

          <section aria-label="Projects">
            {projects.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-lg font-semibold tracking-tight">
                  No projects yet
                </p>
                <p className="text-muted-foreground mt-2 text-sm leading-7">
                  Your projects and sessions will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-10">
                {projects.map((project) => {
                  const projectSessions = sessions.filter(
                    (entry) => entry.session.project_id === project.id,
                  );
                  return (
                    <div
                      key={project.id}
                      className="border-border border-b pb-8"
                    >
                      <div>
                        <div className="flex items-center pb-2">
                          <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate font-mono text-sm font-semibold tracking-tight uppercase">
                                  {project.name}
                                </span>
                              </span>
                            </span>
                          </div>
                          <ProjectActionsDropdown
                            projectId={project.id}
                            projectName={project.name}
                          />
                        </div>

                        <div>
                          {projectSessions.length === 0 ? (
                            <p className="text-muted-foreground py-6 text-sm leading-7">
                              This project does not have any sessions yet.
                            </p>
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
                      </div>
                    </div>
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
