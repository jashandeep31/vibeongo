"use client";

import { CreateProjectSessionDialog } from "@/components/dialogs/create-project-session-dialog";
import { GithubRepoDirectoryDialog } from "@/components/dialogs/github-repo-directory-dialog";
import {
  ProjectSessionRuntimeDialog,
  type ProjectSessionRuntime,
} from "@/components/dialogs/project-session-runtime-dialog";
import {
  useGetProjectDomainsById,
  useGetProjectGithubReposById,
} from "@/hooks/use-project";
import { useResumeProjectSession } from "@/hooks/use-project-sessions";
import {
  useProjectsStore,
  useSessionChatsStore,
  useSessionsStore,
} from "@/store/playground-store";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@repo/ui/components/command";
import { useIsFetching } from "@tanstack/react-query";
import {
  ArrowLeft,
  BotMessageSquare,
  ExternalLink,
  Folder,
  Globe,
  Loader2,
  MessageSquarePlus,
  Play,
  Plus,
  Settings,
  SquareDashedMousePointer,
  SquarePen,
  WalletCards,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type CommandView =
  | { kind: "projects" }
  | { kind: "project-sessions"; projectId: string }
  | { kind: "project-chats"; projectId: string }
  | {
      kind: "session-chats";
      projectId: string;
      projectSessionId: string;
    }
  | { kind: "domains"; projectId: string };

const staticNavigation = [
  { title: "Home", url: "/", icon: SquarePen },
  { title: "Wallet", url: "/wallet", icon: WalletCards },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

function getServerUrl(
  entry: ReturnType<typeof useSessionsStore.getState>["sessions"][number],
) {
  if (entry.state !== "running" || !entry.instance) return null;
  return `https://4096-${entry.instance.id}${entry.instance.proxy_domain}`;
}

export function PlaygroundCommandBox() {
  const router = useRouter();
  const params = useParams<{ projectId?: string; chatId?: string }>();
  const routeProjectId = params.projectId;
  const routeProjectSessionId = params.chatId;
  const projects = useProjectsStore((store) => store.projects);
  const sessions = useSessionsStore((store) => store.sessions);
  const chatsBySessionId = useSessionChatsStore(
    (store) => store.chatsBySessionId,
  );
  const fetchingChatLists = useIsFetching({
    queryKey: ["opencode", "chat-sessions"],
  });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [viewStack, setViewStack] = useState<CommandView[]>([
    { kind: "projects" },
  ]);
  const [runtimeDialogSessionId, setRuntimeDialogSessionId] = useState<
    string | null
  >(null);
  const [createSessionProjectId, setCreateSessionProjectId] = useState<
    string | null
  >(null);
  const [repoDialogSessionId, setRepoDialogSessionId] = useState<string | null>(
    null,
  );
  const resumeSession = useResumeProjectSession();
  const view = viewStack.at(-1) ?? { kind: "projects" };
  const domainProjectId = view.kind === "domains" ? view.projectId : null;
  const {
    data: domainData,
    isPending: domainsPending,
    isError: domainsError,
  } = useGetProjectDomainsById(domainProjectId, open);
  const repoDialogSession = repoDialogSessionId
    ? sessions.find((entry) => entry.session.id === repoDialogSessionId)
    : undefined;
  const {
    data: githubRepos,
    isPending: reposPending,
    isError: reposError,
  } = useGetProjectGithubReposById(
    repoDialogSession?.session.project_id ?? null,
    repoDialogSessionId !== null,
  );

  const domains = useMemo(
    () =>
      [...(domainData?.proxy_domains ?? [])].sort((left, right) => {
        const portOrder = left.target_port - right.target_port;
        return portOrder || left.domain.localeCompare(right.domain);
      }),
    [domainData?.proxy_domains],
  );

  const getInitialView = useCallback((): CommandView => {
    if (routeProjectId && routeProjectSessionId) {
      return {
        kind: "session-chats",
        projectId: routeProjectId,
        projectSessionId: routeProjectSessionId,
      };
    }
    if (routeProjectId) {
      return { kind: "project-chats", projectId: routeProjectId };
    }
    return { kind: "projects" };
  }, [routeProjectId, routeProjectSessionId]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        setQuery("");
        setViewStack([getInitialView()]);
      }
    },
    [getInitialView],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || (!event.ctrlKey && !event.metaKey))
        return;

      event.preventDefault();
      setOpen((currentlyOpen) => {
        const nextOpen = !currentlyOpen;
        if (nextOpen) {
          setQuery("");
          setViewStack([getInitialView()]);
        }
        return nextOpen;
      });
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [getInitialView]);

  const pushView = (nextView: CommandView) => {
    setQuery("");
    setViewStack((current) => [...current, nextView]);
  };

  const goBack = () => {
    setQuery("");
    setViewStack((current) =>
      current.length > 1 ? current.slice(0, -1) : current,
    );
  };

  const openProjectSessions = (targetProjectId: string) => {
    setQuery("");
    setViewStack([{ kind: "project-sessions", projectId: targetProjectId }]);
  };

  const projectId = "projectId" in view ? view.projectId : null;
  const project = projectId
    ? projects.find((candidate) => candidate.id === projectId)
    : undefined;
  const projectSessions = projectId
    ? sessions.filter((entry) => entry.session.project_id === projectId)
    : [];
  const selectedSession =
    "projectSessionId" in view
      ? sessions.find((entry) => entry.session.id === view.projectSessionId)
      : undefined;

  const combinedProjectChats = projectSessions.flatMap((entry) => {
    const serverUrl = getServerUrl(entry);
    if (!serverUrl) return [];

    return (chatsBySessionId[entry.session.id] ?? []).map((chat) => ({
      chat,
      entry,
      serverUrl,
    }));
  });

  const selectedSessionChats = selectedSession
    ? (chatsBySessionId[selectedSession.session.id] ?? [])
    : [];
  const selectedSessionServerUrl = selectedSession
    ? getServerUrl(selectedSession)
    : null;

  const openChat = (
    targetProjectId: string,
    projectSessionId: string,
    opencodeSessionId: string,
    serverUrl: string,
  ) => {
    const searchParams = new URLSearchParams({ serverUrl });
    router.push(
      `/projects/${encodeURIComponent(targetProjectId)}/chats/${encodeURIComponent(projectSessionId)}/sessions/${encodeURIComponent(opencodeSessionId)}?${searchParams.toString()}`,
    );
    setOpen(false);
  };

  const handleRuntimeSelect = (runtime: ProjectSessionRuntime) => {
    if (!runtimeDialogSessionId) return;

    const sessionId = runtimeDialogSessionId;
    setRuntimeDialogSessionId(null);
    resumeSession.mutate({ id: sessionId, runtime });
    setOpen(true);
  };

  const handleRepoSelect = (directory: string) => {
    if (!repoDialogSession) return;

    const serverUrl = getServerUrl(repoDialogSession);
    if (!serverUrl) return;

    const searchParams = new URLSearchParams({ serverUrl, directory });
    router.push(
      `/projects/${encodeURIComponent(repoDialogSession.session.project_id)}/chats/${encodeURIComponent(repoDialogSession.session.id)}?${searchParams.toString()}`,
    );
    setRepoDialogSessionId(null);
    setOpen(false);
  };

  const hasBack = viewStack.length > 1;
  const heading = (() => {
    switch (view.kind) {
      case "projects":
        return "Projects";
      case "project-sessions":
        return project?.name ?? "Project";
      case "project-chats":
        return `${project?.name ?? "Project"} chats`;
      case "session-chats":
        return selectedSession?.session.name ?? "Session chats";
      case "domains":
        return `${project?.name ?? "Project"} domains`;
    }
  })();
  const projectOptions = projectId ? (
    <CommandGroup heading="Projects">
      {projects.map((item) => (
        <CommandItem
          key={item.id}
          value={`switch project ${item.name} ${item.id}`}
          onSelect={() => openProjectSessions(item.id)}
        >
          <Folder />
          <span className="min-w-0 flex-1 truncate">{item.name}</span>
          {item.id === projectId ? (
            <CommandShortcut>Current</CommandShortcut>
          ) : null}
        </CommandItem>
      ))}
    </CommandGroup>
  ) : null;

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="AI Playground command box"
        description="Navigate pages or search projects, sessions, chats, and domains"
        className="min-w-0 sm:max-w-2xl"
      >
        <Command>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={`Search ${heading.toLowerCase()}...`}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && query === "" && hasBack) {
                event.preventDefault();
                goBack();
              }
            }}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {hasBack ? (
              <CommandGroup>
                <CommandItem value="back" onSelect={goBack}>
                  <ArrowLeft />
                  Back
                  <CommandShortcut>Backspace</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            ) : null}

            {view.kind === "projects" ? (
              <CommandGroup heading="Projects">
                {projects.length ? (
                  projects.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`project ${item.name} ${item.id}`}
                      onSelect={() =>
                        pushView({
                          kind: "project-sessions",
                          projectId: item.id,
                        })
                      }
                    >
                      <Folder />
                      <span className="truncate">{item.name}</span>
                    </CommandItem>
                  ))
                ) : (
                  <CommandItem disabled>No projects found.</CommandItem>
                )}
              </CommandGroup>
            ) : null}

            {view.kind === "project-sessions" ? (
              <>
                <CommandGroup heading="Sessions">
                  {projectSessions.length ? (
                    projectSessions.map((entry) => {
                      return (
                        <CommandItem
                          key={entry.session.id}
                          value={`session ${entry.session.name} ${entry.session.id} ${entry.state}`}
                          onSelect={() =>
                            pushView({
                              kind: "session-chats",
                              projectId: view.projectId,
                              projectSessionId: entry.session.id,
                            })
                          }
                        >
                          <SquareDashedMousePointer />
                          <span className="truncate">{entry.session.name}</span>
                          <CommandShortcut>
                            {entry.state === "processing"
                              ? "Starting"
                              : entry.state === "running"
                                ? "Running"
                                : "Stopped"}
                          </CommandShortcut>
                        </CommandItem>
                      );
                    })
                  ) : (
                    <CommandItem disabled>No sessions found.</CommandItem>
                  )}
                  <CommandItem
                    value={`new session ${project?.name ?? "project"}`}
                    onSelect={() => {
                      setCreateSessionProjectId(view.projectId);
                      setOpen(false);
                    }}
                  >
                    <Plus />
                    New session
                  </CommandItem>
                </CommandGroup>
                <CommandGroup heading={heading}>
                  <CommandItem
                    value={`domains ${project?.name ?? "project"}`}
                    onSelect={() =>
                      pushView({ kind: "domains", projectId: view.projectId })
                    }
                  >
                    <Globe />
                    Domains
                  </CommandItem>
                </CommandGroup>
                {projectOptions}
              </>
            ) : null}

            {view.kind === "project-chats" ? (
              <>
                <CommandGroup heading="Chats">
                  {combinedProjectChats.length ? (
                    combinedProjectChats.map(({ chat, entry, serverUrl }) => (
                      <CommandItem
                        key={`${entry.session.id}:${chat.id}`}
                        value={`chat ${chat.title} ${chat.id} ${entry.session.name} ${entry.session.id}`}
                        onSelect={() =>
                          openChat(
                            view.projectId,
                            entry.session.id,
                            chat.id,
                            serverUrl,
                          )
                        }
                      >
                        <BotMessageSquare />
                        <span className="min-w-0 flex-1 truncate">
                          {chat.title}
                        </span>
                        <CommandShortcut className="max-w-40 truncate tracking-normal normal-case">
                          {entry.session.name}
                        </CommandShortcut>
                      </CommandItem>
                    ))
                  ) : fetchingChatLists ? (
                    <CommandItem disabled>
                      <Loader2 className="animate-spin" />
                      Loading chats...
                    </CommandItem>
                  ) : (
                    <CommandItem disabled>
                      No chats are available from running sessions.
                    </CommandItem>
                  )}
                </CommandGroup>
                <CommandGroup heading={heading}>
                  <CommandItem
                    value={`domains ${project?.name ?? "project"}`}
                    onSelect={() =>
                      pushView({ kind: "domains", projectId: view.projectId })
                    }
                  >
                    <Globe />
                    Domains
                  </CommandItem>
                </CommandGroup>
                {projectOptions}
              </>
            ) : null}

            {view.kind === "session-chats" ? (
              <>
                {selectedSession?.state !== "running" ? (
                  <CommandGroup heading={heading}>
                    {selectedSession?.state === "stopped" ? (
                      <CommandItem
                        value={`resume ${selectedSession.session.name}`}
                        disabled={resumeSession.isPending}
                        onSelect={() => {
                          setRuntimeDialogSessionId(selectedSession.session.id);
                          setOpen(false);
                        }}
                      >
                        <Play />
                        Resume session
                      </CommandItem>
                    ) : null}
                    {selectedSession?.state === "processing" ? (
                      <CommandItem disabled>
                        <Loader2 className="animate-spin" />
                        Session is starting...
                      </CommandItem>
                    ) : null}
                  </CommandGroup>
                ) : null}
                {selectedSession?.state === "running" ? (
                  <CommandGroup heading="Chats">
                    {selectedSessionChats.length && selectedSessionServerUrl ? (
                      selectedSessionChats.map((chat) => (
                        <CommandItem
                          key={chat.id}
                          value={`chat ${chat.title} ${chat.id}`}
                          onSelect={() =>
                            openChat(
                              view.projectId,
                              view.projectSessionId,
                              chat.id,
                              selectedSessionServerUrl,
                            )
                          }
                        >
                          <BotMessageSquare />
                          <span className="truncate">{chat.title}</span>
                        </CommandItem>
                      ))
                    ) : fetchingChatLists ? (
                      <CommandItem disabled>
                        <Loader2 className="animate-spin" />
                        Loading chats...
                      </CommandItem>
                    ) : (
                      <CommandItem disabled>
                        No chats found for this session.
                      </CommandItem>
                    )}
                    <CommandItem
                      value={`new chat ${selectedSession.session.name}`}
                      disabled={!selectedSessionServerUrl}
                      onSelect={() => {
                        setRepoDialogSessionId(selectedSession.session.id);
                        setOpen(false);
                      }}
                    >
                      <MessageSquarePlus />
                      New chat
                    </CommandItem>
                  </CommandGroup>
                ) : (
                  <CommandGroup heading="Chats">
                    <CommandItem disabled>
                      <MessageSquarePlus />
                      New chat
                      <CommandShortcut>
                        {selectedSession?.state === "processing"
                          ? "Starting"
                          : "Resume first"}
                      </CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                )}
                <CommandGroup heading={project?.name ?? "Project"}>
                  <CommandItem
                    value={`domains ${project?.name ?? "project"}`}
                    onSelect={() =>
                      pushView({ kind: "domains", projectId: view.projectId })
                    }
                  >
                    <Globe />
                    Domains
                  </CommandItem>
                </CommandGroup>
                {projectOptions}
              </>
            ) : null}

            {view.kind === "domains" ? (
              <>
                <CommandGroup heading={heading}>
                  {domainsPending ? (
                    <CommandItem disabled>
                      <Loader2 className="animate-spin" />
                      Loading domains...
                    </CommandItem>
                  ) : null}
                  {domainsError ? (
                    <CommandItem disabled className="text-destructive">
                      Could not load project domains.
                    </CommandItem>
                  ) : null}
                  {!domainsPending && !domainsError && domains.length === 0 ? (
                    <CommandItem disabled>
                      No domains are configured.
                    </CommandItem>
                  ) : null}
                  {!domainsPending && !domainsError
                    ? domains.map((domain) => (
                        <CommandItem
                          key={domain.id}
                          value={`domain ${domain.domain} ${domain.target_port}`}
                          onSelect={() => {
                            window.open(
                              `https://${domain.domain}`,
                              "_blank",
                              "noopener,noreferrer",
                            );
                            setOpen(false);
                          }}
                        >
                          <Globe />
                          <span className="min-w-0 flex-1 truncate">
                            {domain.domain}
                          </span>
                          <CommandShortcut className="tracking-normal normal-case">
                            Port {domain.target_port}
                          </CommandShortcut>
                          <ExternalLink className="text-muted-foreground" />
                        </CommandItem>
                      ))
                    : null}
                </CommandGroup>
                {projectOptions}
              </>
            ) : null}

            <CommandGroup heading="Navigation">
              {staticNavigation.map((item) => (
                <CommandItem
                  key={item.url}
                  value={`navigate ${item.title} ${item.url}`}
                  onSelect={() => {
                    router.push(item.url);
                    setOpen(false);
                  }}
                >
                  <item.icon />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
      <ProjectSessionRuntimeDialog
        open={runtimeDialogSessionId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setRuntimeDialogSessionId(null);
            setOpen(true);
          }
        }}
        onSelect={handleRuntimeSelect}
      />
      {createSessionProjectId ? (
        <CreateProjectSessionDialog
          projectId={createSessionProjectId}
          projectName={
            projects.find((item) => item.id === createSessionProjectId)?.name ??
            "Project"
          }
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setCreateSessionProjectId(null);
              setOpen(true);
            }
          }}
        />
      ) : null}
      <GithubRepoDirectoryDialog
        open={repoDialogSessionId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setRepoDialogSessionId(null);
            setOpen(true);
          }
        }}
        repos={githubRepos ?? []}
        isLoading={reposPending}
        isError={reposError}
        onSelect={handleRepoSelect}
      />
    </>
  );
}
