"use client";

import { CreateProjectSessionDialog } from "@/components/dialogs/create-project-session-dialog";
import { GithubRepoDirectoryDialog } from "@/components/dialogs/github-repo-directory-dialog";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import {
  ProjectSessionRuntimeDialog,
  type ProjectSessionRuntime,
} from "@/components/dialogs/project-session-runtime-dialog";
import { useTerminateInstance } from "@/hooks/use-instance";
import {
  useDeleteProject,
  useGetProjectDomainsById,
  useGetProjectGithubReposById,
} from "@/hooks/use-project";
import {
  useArchiveProjectSession,
  useResumeProjectSession,
} from "@/hooks/use-project-sessions";
import {
  useSessionChatsStore,
  useSessionsStore,
} from "@/store/playground-store";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@repo/ui/components/sidebar-v2";
import { Button } from "@repo/ui/components/button";
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
  Clock3,
  ChevronRight,
  Ellipsis,
  FileCode2,
  Folder,
  Loader2,
  Pencil,
  Play,
  Plus,
  SquareDashedMousePointer,
  Timer,
  Trash2,
  BotMessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { instances, projects, projectSessions } from "@repo/db";
import axios from "axios";
import { toast } from "sonner";

type ProjectSessionNavItem = Pick<
  typeof projectSessions.$inferSelect,
  "id" | "name"
> & {
  projectId: (typeof projectSessions.$inferSelect)["project_id"];
};

type Project = Pick<typeof projects.$inferSelect, "id" | "name"> & {
  url: string;
  sessions: ProjectSessionNavItem[];
};

type ProjectSessionNavItemProps = {
  session: Project["sessions"][number];
  isResumePending: boolean;
  isArchivePending: boolean;
  onResume: (sessionId: string) => void;
  onArchive: (sessionId: string) => void;
  onNavigate: () => void;
};

function formatTimeRemaining(terminatesAt: string, now: number) {
  const expiresAt = new Date(terminatesAt).getTime();
  if (Number.isNaN(expiresAt)) return "N/A";

  const remainingMs = expiresAt - now;
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

function RunningSessionButtonContent({
  sessionName,
  terminatesAt,
  needsDomainAssignment,
}: {
  sessionName: string;
  terminatesAt: string;
  needsDomainAssignment: boolean;
}) {
  const expiresAt = new Date(terminatesAt).getTime();
  const [now, setNow] = useState(() => Date.now());
  const isTerminationSoon =
    !Number.isNaN(expiresAt) && expiresAt - now <= 10 * 60 * 1000;

  useEffect(() => {
    if (Number.isNaN(expiresAt)) return;

    let timeoutId: number | undefined;
    let intervalId: number | undefined;

    const startCountdown = () => {
      const currentTime = Date.now();
      setNow(currentTime);

      if (currentTime >= expiresAt) return;

      intervalId = window.setInterval(() => {
        const nextTime = Date.now();
        setNow(nextTime);

        if (nextTime >= expiresAt && intervalId !== undefined) {
          window.clearInterval(intervalId);
          intervalId = undefined;
        }
      }, 1000);
    };

    const scheduleCountdown = () => {
      const delay = expiresAt - 10 * 60 * 1000 - Date.now();
      if (delay <= 0) {
        startCountdown();
        return;
      }

      timeoutId = window.setTimeout(
        scheduleCountdown,
        Math.min(delay, 2_147_483_647),
      );
    };

    scheduleCountdown();

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [expiresAt]);

  return (
    <>
      {isTerminationSoon ? (
        <Timer className="text-orange-500" />
      ) : (
        <SquareDashedMousePointer />
      )}
      <span className="min-w-0 truncate" title={sessionName}>
        {sessionName}
      </span>
      {isTerminationSoon ? (
        <span
          className="ml-auto shrink-0 font-mono text-xs font-medium text-orange-500 tabular-nums"
          title="Time until instance termination"
        >
          {formatTimeRemaining(terminatesAt, now)}
        </span>
      ) : null}
      <span
        className={`${isTerminationSoon ? "ml-0" : "ml-1"} size-2 shrink-0 rounded-full ${
          needsDomainAssignment ? "bg-blue-500" : "bg-emerald-500"
        }`}
        title={
          needsDomainAssignment
            ? "Running — domains need assignment"
            : "Running"
        }
      >
        <span className="sr-only">
          {needsDomainAssignment
            ? "Running — domains need assignment"
            : "Running"}
        </span>
      </span>
      <ChevronRight className="ml-1 transition-transform group-data-[state=open]/session:rotate-90" />
    </>
  );
}

function getRepoDirectory(fullName: string) {
  const repoName = fullName.split("/").filter(Boolean).at(-1) ?? fullName;
  return `/home/ubuntu/code/${repoName}`;
}

function InstanceControls({
  instance,
  projectId,
  sessionId,
}: {
  instance: typeof instances.$inferSelect;
  projectId: string;
  sessionId: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [isOpen, setIsOpen] = useState(false);
  const [isTerminationConfirmationOpen, setIsTerminationConfirmationOpen] =
    useState(false);
  const terminateInstance = useTerminateInstance(projectId, sessionId);

  useEffect(() => {
    if (!isOpen) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isOpen]);

  return (
    <>
      <DropdownMenu
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (open) setNow(Date.now());
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Instance controls"
            title="Instance controls"
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
            <Clock3 className="text-muted-foreground size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Terminates in</p>
              <p className="font-mono text-sm font-medium tabular-nums">
                {/*  NOTE: fix this later by checking what is function i doing its ai generated */}
                {formatTimeRemaining(String(instance.terminates_at), now)}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={terminateInstance.isPending}
            onSelect={() => setIsTerminationConfirmationOpen(true)}
          >
            <Trash2 />
            Terminate now
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmationDialog
        open={isTerminationConfirmationOpen}
        onOpenChange={setIsTerminationConfirmationOpen}
        title="Terminate this instance?"
        description="The running session instance will be terminated immediately. Any unsaved work on the instance may be lost."
        confirmText="Terminate now"
        isDestructive
        onConfirm={() => {
          setIsTerminationConfirmationOpen(false);
          terminateInstance.mutate(instance.id);
        }}
      />
    </>
  );
}

function ProjectSessionNavItem({
  session,
  isResumePending,
  isArchivePending,
  onResume,
  onArchive,
  onNavigate,
}: ProjectSessionNavItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isRepoDialogOpen, setIsRepoDialogOpen] = useState(false);
  const [isStartingNewChat, setIsStartingNewChat] = useState(false);
  const [isArchiveConfirmationOpen, setIsArchiveConfirmationOpen] =
    useState(false);
  const sessionEntry = useSessionsStore((store) =>
    store.sessions.find((entry) => entry.session.id === session.id),
  );
  const opencodeSessions = useSessionChatsStore(
    (store) => store.chatsBySessionId[session.id],
  );
  const opencodeStatuses = useSessionChatsStore(
    (store) => store.statusesBySessionId[session.id],
  );
  const opencodeUnread = useSessionChatsStore(
    (store) => store.unreadBySessionId[session.id],
  );
  const instance = sessionEntry?.instance ?? null;
  const isInstancePending = sessionEntry?.instanceSyncState === "pending";
  const isInstanceError = sessionEntry?.instanceSyncState === "error";
  const { data: projectDomains } = useGetProjectDomainsById(
    session.projectId,
    !!instance,
  );
  const needsDomainAssignment =
    !!instance && projectDomains?.target_instance_id !== instance.id;
  const opencodeDomain = instance
    ? `4096-${instance.id}${instance.proxy_domain}`
    : undefined;
  const serverUrl =
    sessionEntry?.state === "running" && opencodeDomain
      ? `https://${opencodeDomain}`
      : "";
  const chatUrl = `/projects/${session.projectId}/chats/${session.id}`;

  const {
    data: githubRepos,
    isPending: isReposPending,
    isError: isReposError,
    refetch: refetchGithubRepos,
  } = useGetProjectGithubReposById(
    session.projectId,
    isRepoDialogOpen && !!serverUrl,
  );

  const handleRepoSelect = (directory: string) => {
    setIsRepoDialogOpen(false);
    const params = new URLSearchParams({ serverUrl, directory });
    router.push(`${chatUrl}?${params.toString()}`);
    onNavigate();
  };

  const handleNewChat = async () => {
    setIsStartingNewChat(true);

    const result = await refetchGithubRepos();
    const repos = result.data ?? [];
    const [onlyRepo] = repos;

    if (result.isSuccess && repos.length === 1 && onlyRepo) {
      handleRepoSelect(getRepoDirectory(onlyRepo.full_name));
    } else {
      setIsRepoDialogOpen(true);
    }

    setIsStartingNewChat(false);
  };

  if (serverUrl && instance) {
    return (
      <>
        <Collapsible asChild defaultOpen className="group/session">
          <SidebarMenuSubItem>
            <div className="flex items-center gap-1">
              <CollapsibleTrigger asChild>
                <SidebarMenuSubButton asChild className="min-w-0 flex-1">
                  <button type="button">
                    <RunningSessionButtonContent
                      sessionName={session.name}
                      terminatesAt={String(instance.terminates_at)}
                      needsDomainAssignment={needsDomainAssignment}
                    />
                  </button>
                </SidebarMenuSubButton>
              </CollapsibleTrigger>
              <InstanceControls
                instance={instance}
                projectId={session.projectId}
                sessionId={session.id}
              />
            </div>

            <CollapsibleContent>
              <SidebarMenuSub className="mr-0 ml-4">
                {(opencodeSessions ?? []).map((opencodeSession) => {
                  const params = new URLSearchParams({ serverUrl });
                  const url = `${chatUrl}/sessions/${encodeURIComponent(opencodeSession.id)}?${params.toString()}`;
                  const isProcessing =
                    opencodeStatuses?.[opencodeSession.id]?.type !== "idle" &&
                    opencodeStatuses?.[opencodeSession.id] !== undefined;
                  const hasUnreadAnswer =
                    !isProcessing &&
                    opencodeUnread?.[opencodeSession.id] === true;

                  return (
                    <SidebarMenuSubItem key={opencodeSession.id}>
                      <SidebarMenuSubButton
                        asChild
                        size="sm"
                        isActive={pathname === url.split("?")[0]}
                      >
                        <Link
                          href={url}
                          onClick={() => {
                            useSessionChatsStore
                              .getState()
                              .setChatUnread(
                                session.id,
                                opencodeSession.id,
                                false,
                              );
                            onNavigate();
                          }}
                        >
                          {isProcessing ? (
                            <Loader2
                              className="animate-spin"
                              aria-label="Chat is processing"
                            />
                          ) : (
                            <BotMessageSquare />
                          )}
                          <span
                            className="min-w-0 flex-1 truncate"
                            title={opencodeSession.title}
                          >
                            {opencodeSession.title}
                          </span>
                          {hasUnreadAnswer ? (
                            <span
                              className="ml-auto size-2.5 shrink-0 rounded-full bg-blue-500 ring-2 ring-blue-500/20"
                              title="New answer"
                            >
                              <span className="sr-only">New answer</span>
                            </span>
                          ) : null}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild size="sm">
                    <button
                      type="button"
                      disabled={isStartingNewChat}
                      onClick={handleNewChat}
                    >
                      {isStartingNewChat ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Plus />
                      )}
                      <span>New chat</span>
                    </button>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuSubItem>
        </Collapsible>
        <GithubRepoDirectoryDialog
          open={isRepoDialogOpen}
          onOpenChange={setIsRepoDialogOpen}
          repos={githubRepos ?? []}
          isLoading={isReposPending}
          isError={isReposError}
          onSelect={handleRepoSelect}
        />
      </>
    );
  }

  return (
    <>
      <SidebarMenuSubItem>
        <div className="flex items-center gap-1">
          <SidebarMenuSubButton className="min-w-0 flex-1">
            <SquareDashedMousePointer />
            <span className="min-w-0 flex-1 truncate" title={session.name}>
              {session.name}
            </span>
            {instance ? (
              <span
                className="ml-auto size-2 shrink-0 animate-pulse rounded-full bg-amber-500"
                title="OpenCode is starting"
              >
                <span className="sr-only">OpenCode is starting</span>
              </span>
            ) : null}
          </SidebarMenuSubButton>
          {instance ? (
            <InstanceControls
              instance={instance}
              projectId={session.projectId}
              sessionId={session.id}
            />
          ) : null}
          {!isInstancePending && !isInstanceError && !instance ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Resume ${session.name}`}
                title="Resume session"
                disabled={isResumePending || isArchivePending}
                onClick={() => onResume(session.id)}
              >
                <Play />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`More options for ${session.name}`}
                    title="Session options"
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
          ) : null}
        </div>
      </SidebarMenuSubItem>
      <ConfirmationDialog
        open={isArchiveConfirmationOpen}
        onOpenChange={setIsArchiveConfirmationOpen}
        title="Archive session?"
        description={`Archive "${session.name}"? It will be hidden from your active sessions list.`}
        confirmText="Archive"
        onConfirm={() => {
          setIsArchiveConfirmationOpen(false);
          onArchive(session.id);
        }}
      />
    </>
  );
}

export function NavProjects({ projects }: { projects: Project[] }) {
  const params = useParams<{ projectId?: string }>();
  const activeProjectId = params.projectId;
  const router = useRouter();
  const deleteProject = useDeleteProject();
  const resumeSession = useResumeProjectSession();
  const archiveSession = useArchiveProjectSession();
  const sessions = useSessionsStore((store) => store.sessions);
  const { isMobile, setOpenMobile } = useSidebar();
  const [openProjectIds, setOpenProjectIds] = useState<Set<string>>(
    () => new Set(activeProjectId ? [activeProjectId] : []),
  );
  const [runtimeDialogSessionId, setRuntimeDialogSessionId] = useState<
    string | null
  >(null);
  const [archivingSessionId, setArchivingSessionId] = useState<string | null>(
    null,
  );
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    const projectIdsToOpen = sessions
      .filter((entry) => entry.state === "running")
      .map((entry) => entry.session.project_id);

    if (activeProjectId) projectIdsToOpen.push(activeProjectId);
    if (projectIdsToOpen.length === 0) return;

    setOpenProjectIds((current) => {
      const next = new Set(current);
      let didChange = false;

      for (const projectId of projectIdsToOpen) {
        if (next.has(projectId)) continue;
        next.add(projectId);
        didChange = true;
      }

      return didChange ? next : current;
    });
  }, [activeProjectId, sessions]);

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleRuntimeSelect = (runtime: ProjectSessionRuntime) => {
    if (!runtimeDialogSessionId) return;

    const sessionId = runtimeDialogSessionId;
    setRuntimeDialogSessionId(null);
    resumeSession.mutate({ id: sessionId, runtime });
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

  const handleDeleteProject = () => {
    if (!projectToDelete) return;

    const project = projectToDelete;
    setProjectToDelete(null);
    deleteProject.mutate(project.id, {
      onSuccess: () => {
        setOpenProjectIds((current) => {
          const next = new Set(current);
          next.delete(project.id);
          return next;
        });
        if (activeProjectId === project.id) router.push("/");
        toast.success("Project deleted");
      },
      onError: (error) => {
        const responseMessage = axios.isAxiosError<{ message?: unknown }>(error)
          ? error.response?.data?.message
          : undefined;
        toast.error(
          typeof responseMessage === "string"
            ? responseMessage
            : "Failed to delete project",
        );
      },
    });
  };

  return (
    <>
      <SidebarGroup className="px-2 py-3">
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {projects.map((project) => (
              <Collapsible
                key={project.id}
                open={openProjectIds.has(project.id)}
                onOpenChange={(open) => {
                  setOpenProjectIds((current) => {
                    const next = new Set(current);
                    if (open) next.add(project.id);
                    else next.delete(project.id);
                    return next;
                  });
                }}
                className="group/project"
              >
                <SidebarMenuItem>
                  <div className="flex items-center gap-1">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="h-9 min-w-0 flex-1 rounded-xl px-3 font-normal">
                        <Folder
                          className={
                            sessions.some(
                              (entry) =>
                                entry.session.project_id === project.id &&
                                entry.state === "running",
                            )
                              ? "text-orange-500"
                              : undefined
                          }
                        />
                        <span className="min-w-0 truncate">{project.name}</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/project:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                          aria-label={`Actions for ${project.name}`}
                          title={`Actions for ${project.name}`}
                        >
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/projects/${project.id}/edit`}
                            onClick={closeMobileSidebar}
                          >
                            <Pencil />
                            Edit project
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/projects/${project.id}/env`}
                            onClick={closeMobileSidebar}
                          >
                            <FileCode2 />
                            Edit environment
                          </Link>
                        </DropdownMenuItem>
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={deleteProject.isPending}
                          onSelect={() => setProjectToDelete(project)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {project.sessions.map((session) => (
                        <ProjectSessionNavItem
                          key={session.id}
                          session={session}
                          isResumePending={resumeSession.isPending}
                          isArchivePending={archivingSessionId === session.id}
                          onResume={setRuntimeDialogSessionId}
                          onArchive={handleArchive}
                          onNavigate={closeMobileSidebar}
                        />
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <ProjectSessionRuntimeDialog
        open={runtimeDialogSessionId !== null}
        onOpenChange={(open) => {
          if (!open) setRuntimeDialogSessionId(null);
        }}
        onSelect={handleRuntimeSelect}
      />
      <ConfirmationDialog
        open={projectToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setProjectToDelete(null);
        }}
        title="Delete project?"
        description={
          projectToDelete
            ? `Delete "${projectToDelete.name}"? This cannot be undone.`
            : "This cannot be undone."
        }
        confirmText="Delete project"
        isDestructive
        lockSeconds={3}
        requiredConfirmationText="delete"
        onConfirm={handleDeleteProject}
      />
    </>
  );
}
