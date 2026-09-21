import {
  useGetInstances,
  useGetProjectsWithSessions,
  useOpencodeSessions,
  useOpencodeStatus,
  useQueryClient,
} from "@repo/api-hooks";
import {
  getOpencodePassword,
  getOpencodeQuestions,
  getOpencodeSessionRaw,
  getOpencodeSessionStatuses,
  OPENCODE_MESSAGE_PAGE_SIZE,
  reduceOpencodeSessionData,
  streamOpencodeEvents,
  type Event,
  type OpencodeSessionData,
  type Session,
} from "@repo/api-client";
import {
  useProjectsStore,
  useSessionChatsStore,
  useSessionsStore,
  useTerminalWorkspaceStore,
} from "@repo/app-store";
import { fetch as expoFetch } from "expo/fetch";
import { useGlobalSearchParams, usePathname } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useVibeongoWsV2 } from "@/hooks/use-vibeongo-ws-v2";

function getConfigValue(config: unknown, key: string) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return "";
  }

  const value = (config as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function ProjectSessionRuntimeSync({
  activeOpencodeSessionId,
  sessionId,
  workspaceEnabled,
}: {
  activeOpencodeSessionId: string;
  sessionId: string;
  workspaceEnabled: boolean;
}) {
  const queryClient = useQueryClient();
  const activeOpencodeSessionIdRef = useRef(activeOpencodeSessionId);
  activeOpencodeSessionIdRef.current = activeOpencodeSessionId;
  const updateSession = useSessionsStore((store) => store.updateSession);
  const instancesQuery = useGetInstances({
    sessionId,
    state: "running",
    limit: 1,
  });
  const instance = instancesQuery.data?.data[0];
  const runtimeUrl = instance
    ? `https://3101-${instance.id}${instance.proxy_domain}`
    : "";
  const serverUrl = instance
    ? `https://4096-${instance.id}${instance.proxy_domain}`
    : "";
  const accessToken = instance?.access_token ?? "";
  const localToken = getConfigValue(instance?.config, "vibeongoLocalToken");
  const terminalWorkspace = useVibeongoWsV2({
    accessToken,
    enabled: Boolean(workspaceEnabled && instance && localToken && accessToken),
    localToken,
    runtimeUrl,
  });
  const setTerminalWorkspace = useTerminalWorkspaceStore(
    (store) => store.setWorkspace,
  );
  const password = getOpencodePassword(instance?.config);
  const statusQuery = useOpencodeStatus(
    instance?.id ?? "",
    runtimeUrl,
    localToken,
    accessToken,
    Boolean(instance),
  );
  const isOpencodeRunning = statusQuery.data?.running === true;
  const sessionsQuery = useOpencodeSessions(
    sessionId,
    isOpencodeRunning ? serverUrl : "",
    accessToken,
    password,
    isOpencodeRunning,
  );
  const prefetchChatMessages = useCallback(
    async (chats = sessionsQuery.data ?? []) => {
      if (!isOpencodeRunning || !serverUrl || !accessToken || !password) return;

      let nextIndex = 0;
      const prefetchNext = async () => {
        while (nextIndex < chats.length) {
          const chat = chats[nextIndex++];
          if (!chat) continue;
          await queryClient.prefetchQuery({
            queryKey: ["opencode", "session", sessionId, chat.id, serverUrl],
            queryFn: () =>
              getOpencodeSessionRaw(
                sessionId,
                chat.id,
                serverUrl,
                accessToken,
                password,
                OPENCODE_MESSAGE_PAGE_SIZE,
              ),
            gcTime: 30 * 60 * 1_000,
            staleTime: 30 * 60 * 1_000,
          });
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(3, chats.length) }, prefetchNext),
      );
    },
    [
      accessToken,
      isOpencodeRunning,
      password,
      queryClient,
      serverUrl,
      sessionId,
      sessionsQuery.data,
    ],
  );

  useEffect(() => {
    void prefetchChatMessages();
  }, [prefetchChatMessages]);

  useEffect(() => {
    setTerminalWorkspace(sessionId, {
      activeTerminalSessionId: terminalWorkspace.activeTerminalSessionId,
      favoriteDirs: terminalWorkspace.favoriteDirs,
      status: terminalWorkspace.status,
      terminalSessionIds: terminalWorkspace.terminalSessionIds,
      terminalSessions: terminalWorkspace.terminalSessions,
      tmuxSessions: terminalWorkspace.tmuxSessions,
    });
  }, [
    sessionId,
    setTerminalWorkspace,
    terminalWorkspace.activeTerminalSessionId,
    terminalWorkspace.favoriteDirs,
    terminalWorkspace.status,
    terminalWorkspace.terminalSessionIds,
    terminalWorkspace.terminalSessions,
    terminalWorkspace.tmuxSessions,
  ]);

  useEffect(() => {
    if (!isOpencodeRunning || !serverUrl || !accessToken) return;

    let disposed = false;
    let streamController: AbortController | null = null;
    const pendingSessionResyncs = new Set<string>();

    const resyncSessionAfterMissingEvent = (opencodeSessionId: string) => {
      if (pendingSessionResyncs.has(opencodeSessionId)) return;
      pendingSessionResyncs.add(opencodeSessionId);
      void queryClient
        .invalidateQueries({
          queryKey: [
            "opencode",
            "session",
            sessionId,
            opencodeSessionId,
            serverUrl,
          ],
          exact: true,
        })
        .finally(() => pendingSessionResyncs.delete(opencodeSessionId));
    };

    const applyQueryEvents = (opencodeSessionId: string, events: Event[]) => {
      if (events.length === 0) return;
      const exactQueryKey = [
        "opencode",
        "session",
        sessionId,
        opencodeSessionId,
        serverUrl,
      ];
      const cachedSession =
        queryClient.getQueryData<OpencodeSessionData>(exactQueryKey);
      let reducedSession = cachedSession;

      for (const event of events) {
        if (
          reducedSession &&
          isIncrementalMessageEventMissingContext(
            reducedSession,
            event,
            opencodeSessionId,
          )
        ) {
          resyncSessionAfterMissingEvent(opencodeSessionId);
        }
        if (reducedSession) {
          reducedSession = reduceOpencodeSessionData(
            reducedSession,
            event,
            opencodeSessionId,
          );
        }
      }

      queryClient.setQueriesData<OpencodeSessionData>(
        {
          queryKey: ["opencode", "session", sessionId, opencodeSessionId],
        },
        (current) => {
          if (current === cachedSession && reducedSession) {
            return reducedSession;
          }
          return events.reduce(
            (next, event) =>
              next
                ? reduceOpencodeSessionData(next, event, opencodeSessionId)
                : next,
            current,
          );
        },
      );
    };

    const handleEvent = (event: Event) => {
      const opencodeSessionId = getEventSessionId(event);
      const store = useSessionChatsStore.getState();

      if (
        event.type === "session.created" ||
        event.type === "session.updated"
      ) {
        const info =
          event.type === "session.created"
            ? sessionFromCreatedEvent(event)
            : (event.properties.info as Session | undefined);
        if (info?.parentID) {
          store.deleteSessionChat(sessionId, info.id);
        } else if (info) {
          store.upsertSessionChat(sessionId, info);
        }
        void sessionsQuery.refetch();
      } else if (
        event.type === "session.model.selected" ||
        event.type === "session.agent.selected"
      ) {
        const session = store
          .getSessionChats(sessionId)
          .find((item) => item.id === opencodeSessionId);
        if (session) {
          store.upsertSessionChat(sessionId, {
            ...session,
            ...(event.type === "session.model.selected"
              ? { model: event.properties.model }
              : { agent: event.properties.agent }),
          });
        }
      } else if (event.type === "session.deleted") {
        store.deleteSessionChat(sessionId, event.properties.sessionID);
        void sessionsQuery.refetch();
      }

      if (!opencodeSessionId) return;
      applyQueryEvents(opencodeSessionId, [event]);

      if (event.type === "session.status") {
        store.setChatStatus(
          sessionId,
          opencodeSessionId,
          event.properties.status,
        );
      } else if (isSessionCompletionEvent(event)) {
        store.setChatStatus(sessionId, opencodeSessionId, { type: "idle" });
      }

      if (event.type === "question.asked") {
        store.setChatAttention(sessionId, opencodeSessionId, true);
      } else if (
        event.type === "question.replied" ||
        event.type === "question.rejected"
      ) {
        store.setChatAttention(sessionId, opencodeSessionId, false);
      }

      if (isSessionCompletionEvent(event)) {
        void queryClient.invalidateQueries({
          queryKey: ["opencode", "session", sessionId, opencodeSessionId],
        });
      }
    };

    const connect = async (signal: AbortSignal) => {
      while (!disposed && !signal.aborted) {
        try {
          await streamOpencodeEvents(
            sessionId,
            serverUrl,
            accessToken,
            password,
            signal,
            handleEvent,
            () => {
              void sessionsQuery.refetch();
              const activeSessionId = activeOpencodeSessionIdRef.current;
              if (activeSessionId) {
                void queryClient.invalidateQueries({
                  queryKey: [
                    "opencode",
                    "session",
                    sessionId,
                    activeSessionId,
                    serverUrl,
                  ],
                  exact: true,
                });
              }
            },
            expoFetch as unknown as typeof globalThis.fetch,
          );
        } catch {}
        if (!disposed && !signal.aborted) {
          await new Promise((resolve) => setTimeout(resolve, 1_000));
        }
      }
    };

    const startStream = () => {
      streamController?.abort();
      streamController = new AbortController();
      void connect(streamController.signal);
    };

    startStream();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      startStream();
      const activeSessionId = activeOpencodeSessionIdRef.current;
      if (activeSessionId) {
        void queryClient.invalidateQueries({
          queryKey: [
            "opencode",
            "session",
            sessionId,
            activeSessionId,
            serverUrl,
          ],
          exact: true,
        });
      }
    });

    return () => {
      disposed = true;
      subscription.remove();
      streamController?.abort();
    };
  }, [
    accessToken,
    isOpencodeRunning,
    password,
    queryClient,
    serverUrl,
    sessionId,
    sessionsQuery.refetch,
  ]);

  useEffect(() => {
    const opencodeSessions = sessionsQuery.data;
    if (
      !isOpencodeRunning ||
      !opencodeSessions?.length ||
      !serverUrl ||
      !accessToken
    ) {
      return;
    }

    let disposed = false;
    const syncStatuses = async () => {
      try {
        const [statuses, questions] = await Promise.all([
          getOpencodeSessionStatuses(
            sessionId,
            opencodeSessions,
            serverUrl,
            accessToken,
            password,
          ),
          getOpencodeQuestions(sessionId, serverUrl, accessToken, password),
        ]);
        if (disposed) return;

        const store = useSessionChatsStore.getState();
        const chatsNeedingAttention = new Set(
          questions.map((question) => question.sessionID),
        );
        for (const chat of opencodeSessions) {
          const previous = store.getChatStatus(sessionId, chat.id);
          const next = statuses[chat.id] ?? { type: "idle" as const };
          store.setChatStatus(sessionId, chat.id, next);
          store.setChatAttention(
            sessionId,
            chat.id,
            chatsNeedingAttention.has(chat.id),
          );

          if (
            previous.type !== "idle" &&
            next.type === "idle" &&
            activeOpencodeSessionId !== chat.id
          ) {
            store.setChatUnread(sessionId, chat.id, true);
          }
        }
      } catch {
        // The runtime can briefly reject requests while starting or stopping.
      }
    };

    void syncStatuses();
    const interval = setInterval(() => void syncStatuses(), 3_000);
    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, [
    accessToken,
    activeOpencodeSessionId,
    isOpencodeRunning,
    password,
    serverUrl,
    sessionId,
    sessionsQuery.data,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void instancesQuery.refetch();
      if (instance) void statusQuery.refetch();
      if (isOpencodeRunning) {
        void sessionsQuery
          .refetch()
          .then((result) => prefetchChatMessages(result.data ?? []));
      }
    });

    return () => subscription.remove();
  }, [
    instance,
    instancesQuery.refetch,
    isOpencodeRunning,
    prefetchChatMessages,
    sessionsQuery.refetch,
    statusQuery.refetch,
  ]);

  useEffect(() => {
    if (instancesQuery.isPending) {
      updateSession(sessionId, { instanceSyncState: "pending" });
      return;
    }

    if (!instance) {
      updateSession(sessionId, {
        instance: null,
        state: "stopped",
        instanceSyncState: instancesQuery.isError ? "error" : "success",
      });
      return;
    }

    updateSession(sessionId, {
      instance,
      state: isOpencodeRunning ? "running" : "processing",
      instanceSyncState: "success",
    });
  }, [
    instance,
    instancesQuery.isError,
    instancesQuery.isPending,
    isOpencodeRunning,
    sessionId,
    updateSession,
  ]);

  return null;
}

function getEventSessionId(event: Event) {
  const properties = event.properties as
    | { sessionID?: unknown }
    | null
    | undefined;
  return typeof properties?.sessionID === "string"
    ? properties.sessionID
    : undefined;
}

function sessionFromCreatedEvent(event: Event): Session | undefined {
  const value = event.properties as Record<string, unknown>;
  if (typeof value.sessionID !== "string") return undefined;
  const location = value.location as { directory?: unknown } | undefined;
  if (typeof location?.directory !== "string") return undefined;
  const model = value.model as
    | { id?: unknown; providerID?: unknown; variant?: unknown }
    | undefined;
  return {
    id: value.sessionID,
    slug: typeof value.slug === "string" ? value.slug : value.sessionID,
    projectID: typeof value.projectID === "string" ? value.projectID : "",
    directory: location.directory,
    ...(typeof value.parentID === "string" ? { parentID: value.parentID } : {}),
    title:
      typeof value.title === "string" && value.title.trim()
        ? value.title
        : "New chat",
    ...(typeof value.agent === "string" ? { agent: value.agent } : {}),
    ...(typeof model?.id === "string" && typeof model.providerID === "string"
      ? {
          model: {
            id: model.id,
            providerID: model.providerID,
            ...(typeof model.variant === "string"
              ? { variant: model.variant }
              : {}),
          },
        }
      : {}),
    version: typeof value.version === "string" ? value.version : "v2",
    time: { created: Date.now(), updated: Date.now() },
  };
}

function isSessionCompletionEvent(event: Event) {
  return (
    event.type === "session.idle" ||
    event.type === "session.error" ||
    event.type === "session.execution.succeeded" ||
    event.type === "session.execution.failed" ||
    event.type === "session.execution.interrupted" ||
    (event.type === "session.status" &&
      event.properties.status?.type === "idle")
  );
}

export function ProjectStoreSync({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const { chatId } = useGlobalSearchParams<{
    chatId?: string | string[];
  }>();
  const { data: projectsWithSessions } = useGetProjectsWithSessions(enabled);
  const sessions = useSessionsStore((store) => store.sessions);
  const addAllProjects = useProjectsStore((store) => store.addAllProjects);
  const addAllSessions = useSessionsStore((store) => store.addAllSessions);

  useEffect(() => {
    if (!projectsWithSessions) return;

    addAllProjects(
      projectsWithSessions.map(
        ({ sessions: _sessions, ...project }) => project,
      ),
    );

    const existingSessions = new Map(
      useSessionsStore
        .getState()
        .sessions.map((entry) => [entry.session.id, entry]),
    );

    addAllSessions(
      projectsWithSessions.flatMap((project) =>
        project.sessions.map((session) => {
          const existing = existingSessions.get(session.id);
          return existing
            ? { ...existing, session }
            : {
                session,
                instance: null,
                state: "stopped" as const,
                instanceSyncState: "pending" as const,
              };
        }),
      ),
    );
  }, [addAllProjects, addAllSessions, projectsWithSessions]);

  const legacyActiveChatMatch = pathname.match(
    /^\/projects\/[^/]+\/sessions\/([^/]+)\/chats\/([^/]+)/,
  );
  const workspaceChatMatch = pathname.match(
    /^\/projects\/[^/]+\/sessions\/([^/]+)\/chat$/,
  );
  const workspaceChatId = Array.isArray(chatId) ? (chatId[0] ?? "") : chatId;
  const activeProjectSessionId =
    workspaceChatMatch?.[1] ?? legacyActiveChatMatch?.[1] ?? "";
  const activeOpencodeSessionId = workspaceChatMatch
    ? workspaceChatId && workspaceChatId !== "new"
      ? workspaceChatId
      : ""
    : (legacyActiveChatMatch?.[2] ?? "");
  const terminalWorkspaceMatch = pathname.match(
    /^\/projects\/[^/]+\/sessions\/([^/]+)\/terminal(?:\/|$)/,
  );

  if (!enabled) return null;

  return sessions.map(({ session }) => (
    <ProjectSessionRuntimeSync
      activeOpencodeSessionId={
        session.id === activeProjectSessionId ? activeOpencodeSessionId : ""
      }
      key={session.id}
      sessionId={session.id}
      workspaceEnabled={terminalWorkspaceMatch?.[1] === session.id}
    />
  ));
}

function isIncrementalMessageEventMissingContext(
  session: OpencodeSessionData,
  event: Event,
  sessionId: string,
) {
  if (
    event.type === "message.part.updated" &&
    event.properties.sessionID === sessionId
  ) {
    return !session.messages.some(
      (message) => message.info.id === event.properties.part.messageID,
    );
  }

  if (
    event.type === "message.part.delta" &&
    event.properties.sessionID === sessionId
  ) {
    const message = session.messages.find(
      (item) => item.info.id === event.properties.messageID,
    );
    return (
      !message ||
      !message.parts.some((part) => part.id === event.properties.partID)
    );
  }

  return false;
}
