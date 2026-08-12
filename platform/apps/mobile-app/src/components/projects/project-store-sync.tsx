import {
  useGetInstances,
  useGetProjectsWithSessions,
  useOpencodeSessions,
  useOpencodeStatus,
} from "@repo/api-hooks";
import {
  getOpencodePassword,
  getOpencodeSessionStatuses,
} from "@repo/api-client";
import {
  useProjectsStore,
  useSessionChatsStore,
  useSessionsStore,
} from "@repo/app-store";
import { usePathname } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";

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
        const statuses = await getOpencodeSessionStatuses(
          sessionId,
          opencodeSessions,
          serverUrl,
          accessToken,
          password,
        );
        if (disposed) return;

        const store = useSessionChatsStore.getState();
        for (const chat of opencodeSessions) {
          const previous = store.getChatStatus(sessionId, chat.id);
          const next = statuses[chat.id] ?? { type: "idle" as const };
          store.setChatStatus(sessionId, chat.id, next);

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

  const activeOpencodeSessionId = pathname.includes("/chats/")
    ? (pathname.split("/chats/")[1]?.split("/")[0] ?? "")
    : "";

  if (!enabled) return null;

  return sessions.map(({ session }) => (
    <ProjectSessionRuntimeSync
      activeOpencodeSessionId={activeOpencodeSessionId}
      key={session.id}
      sessionId={session.id}
    />
  ));
}
