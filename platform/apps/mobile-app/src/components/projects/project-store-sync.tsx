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
  getOpencodeSessionStatuses,
  reduceOpencodeMessages,
  reduceOpencodeSessionData,
  streamOpencodeEvents,
  type Event,
  type OpencodeSessionData,
} from "@repo/api-client";
import {
  useProjectsStore,
  useSessionChatsStore,
  useSessionsStore,
  useTerminalWorkspaceStore,
} from "@repo/app-store";
import { fetch as expoFetch } from "expo/fetch";
import { usePathname } from "expo-router";
import { useEffect } from "react";
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
}: {
  activeOpencodeSessionId: string;
  sessionId: string;
}) {
  const queryClient = useQueryClient();
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
    enabled: Boolean(instance && localToken && accessToken),
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

  useEffect(() => {
    setTerminalWorkspace(sessionId, {
      activeTerminalSessionId: terminalWorkspace.activeTerminalSessionId,
      favoriteDirs: terminalWorkspace.favoriteDirs,
      status: terminalWorkspace.status,
      terminalSessionIds: terminalWorkspace.terminalSessionIds,
      tmuxSessions: terminalWorkspace.tmuxSessions,
    });
  }, [
    sessionId,
    setTerminalWorkspace,
    terminalWorkspace.activeTerminalSessionId,
    terminalWorkspace.favoriteDirs,
    terminalWorkspace.status,
    terminalWorkspace.terminalSessionIds,
    terminalWorkspace.tmuxSessions,
  ]);

  useEffect(() => {
    if (!isOpencodeRunning || !serverUrl || !accessToken) return;

    let disposed = false;
    let streamController: AbortController | null = null;

    const handleEvent = (event: Event) => {
      const opencodeSessionId = getEventSessionId(event);
      const store = useSessionChatsStore.getState();

      if (
        event.type === "session.created" ||
        event.type === "session.updated"
      ) {
        if (event.properties.info.parentID) {
          store.deleteSessionChat(sessionId, event.properties.info.id);
        } else {
          store.upsertSessionChat(sessionId, event.properties.info);
        }
      } else if (event.type === "session.deleted") {
        store.deleteSessionChat(sessionId, event.properties.sessionID);
      }

      if (!opencodeSessionId) return;

      const currentMessages = store.getChatMessages(
        sessionId,
        opencodeSessionId,
      );
      const nextMessages = reduceOpencodeMessages(
        currentMessages,
        event,
        opencodeSessionId,
      );
      if (nextMessages !== currentMessages) {
        store.setChatMessages(sessionId, opencodeSessionId, nextMessages);
      }

      queryClient.setQueriesData<OpencodeSessionData>(
        {
          queryKey: ["opencode", "session", sessionId, opencodeSessionId],
        },
        (current) =>
          current
            ? reduceOpencodeSessionData(current, event, opencodeSessionId)
            : current,
      );

      if (event.type === "session.status") {
        store.setChatStatus(
          sessionId,
          opencodeSessionId,
          event.properties.status,
        );
      } else if (
        event.type === "session.idle" ||
        event.type === "session.error"
      ) {
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

      if (event.type === "session.idle") {
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
            () => void sessionsQuery.refetch(),
            expoFetch as unknown as typeof globalThis.fetch,
          );
        } catch (error) {
          if (!disposed && !signal.aborted) {
            console.error(
              `OpenCode event stream failed for project session ${sessionId}`,
              error,
            );
          }
        }

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
      if (isOpencodeRunning) void sessionsQuery.refetch();
    });

    return () => subscription.remove();
  }, [
    instance,
    instancesQuery.refetch,
    isOpencodeRunning,
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

export function ProjectStoreSync({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
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

  const activeOpencodeSessionId =
    pathname.match(
      /^\/projects\/[^/]+\/sessions\/[^/]+\/chats\/([^/]+)/,
    )?.[1] ?? "";

  if (!enabled) return null;

  return sessions.map(({ session }) => (
    <ProjectSessionRuntimeSync
      activeOpencodeSessionId={activeOpencodeSessionId}
      key={session.id}
      sessionId={session.id}
    />
  ));
}
