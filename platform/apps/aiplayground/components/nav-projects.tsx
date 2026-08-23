"use client";

import { GithubRepoDirectoryDialog } from "@/components/dialogs/github-repo-directory-dialog";
import {
  ProjectSessionRuntimeDialog,
  type ProjectSessionRuntime,
} from "@/components/dialogs/project-session-runtime-dialog";
import {
  formatTimeRemaining,
  InstanceControlsDropdown,
  ProjectActionsDropdown,
  SessionActionsDropdown,
} from "@/components/project-action-menus";
import {
  useGetProjectDomainsById,
  useGetProjectGithubReposById,
} from "@repo/api-hooks";
import {
  useArchiveProjectSession,
  useResumeProjectSession,
} from "@repo/api-hooks";
import { useSessionChatsStore, useSessionsStore } from "@repo/app-store";
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
  ChevronRight,
  Folder,
  Loader2,
  Play,
  Plus,
  SquareDashedMousePointer,
  Timer,
  BotMessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { projects, projectSessions } from "@repo/db";
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
              <InstanceControlsDropdown
                instance={instance}
                projectId={session.projectId}
                sessionId={session.id}
                sessionName={session.name}
                triggerSize="icon-xs"
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
            <InstanceControlsDropdown
              instance={instance}
              projectId={session.projectId}
              sessionId={session.id}
              sessionName={session.name}
              triggerSize="icon-xs"
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
              <SessionActionsDropdown
                sessionName={session.name}
                isArchivePending={isArchivePending}
                onArchive={() => onArchive(session.id)}
                triggerSize="icon-xs"
              />
            </>
          ) : null}
        </div>
      </SidebarMenuSubItem>
    </>
  );
}

export function NavProjects({ projects }: { projects: Project[] }) {
  const params = useParams<{ projectId?: string }>();
  const activeProjectId = params.projectId;
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
                    <ProjectActionsDropdown
                      projectId={project.id}
                      projectName={project.name}
                      onNavigate={closeMobileSidebar}
                      onDeleted={() => {
                        setOpenProjectIds((current) => {
                          const next = new Set(current);
                          next.delete(project.id);
                          return next;
                        });
                      }}
                    />
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
    </>
  );
}
