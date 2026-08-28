"use client";

import { useGetInstances } from "@repo/api-hooks";
import { useOpencodeStatus } from "@repo/api-hooks";
import { useOpencodeSessions } from "@repo/api-hooks";
import { useGetProjectsWithSessions } from "@repo/api-hooks";
import {
  getOpencodePassword,
  getOpencodeSessionMessages,
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
} from "@repo/app-store";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";

function ProjectSessionRuntimeSync({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const routeParams = useParams<{ chatId?: string; sessionId?: string }>();
  const activeChatRef = useRef({
    projectSessionId: routeParams.chatId,
    opencodeSessionId: routeParams.sessionId,
  });
  activeChatRef.current = {
    projectSessionId: routeParams.chatId,
    opencodeSessionId: routeParams.sessionId,
  };
  const statusEventVersionsRef = useRef(new Map<string, number>());
  const handledCompletedAnswersRef = useRef(new Set<string>());
  const updateSession = useSessionsStore((store) => store.updateSession);
  const {
    data: instancesData,
    isPending,
    isError,
  } = useGetInstances({
    sessionId,
    state: "running",
    limit: 1,
  });
  const instance = instancesData?.data[0];
  const instanceConfig =
    instance?.config &&
    typeof instance.config === "object" &&
    !Array.isArray(instance.config)
      ? instance.config
      : undefined;
  const localToken =
    instanceConfig && "vibeongoLocalToken" in instanceConfig
      ? instanceConfig.vibeongoLocalToken
      : undefined;
  const runtimeUrl = instance
    ? `https://3101-${instance.id}${instance.proxy_domain}`
    : "";
  const serverUrl = instance
    ? `https://4096-${instance.id}${instance.proxy_domain}`
    : "";
  const accessToken = instance?.access_token ?? "";
  const opencodePassword = getOpencodePassword(instance?.config);
  const { data: opencodeStatus } = useOpencodeStatus(
    instance?.id ?? "",
    runtimeUrl,
    typeof localToken === "string" ? localToken : "",
    accessToken,
    !!instance,
  );
  const isOpencodeRunning = opencodeStatus?.running === true;

  const { data: opencodeSessions } = useOpencodeSessions(
    sessionId,
    isOpencodeRunning ? serverUrl : "",
    accessToken,
    opencodePassword,
    isOpencodeRunning,
  );

  useEffect(() => {
    if (routeParams.chatId !== sessionId || !routeParams.sessionId) return;

    useSessionChatsStore
      .getState()
      .setChatUnread(sessionId, routeParams.sessionId, false);
  }, [routeParams.chatId, routeParams.sessionId, sessionId]);

  useEffect(() => {
    if (!isOpencodeRunning || !serverUrl || !accessToken || !opencodeSessions) {
      return;
    }

    let disposed = false;

    const hydrateMessages = async () => {
      await Promise.all(
        opencodeSessions.map(async (opencodeSession) => {
          try {
            const messages = await getOpencodeSessionMessages(
              sessionId,
              opencodeSession,
              serverUrl,
              accessToken,
              opencodePassword,
            );
            if (disposed) return;

            useSessionChatsStore
              .getState()
              .setChatMessages(sessionId, opencodeSession.id, messages);
            queryClient.setQueriesData<OpencodeSessionData>(
              {
                queryKey: [
                  "opencode",
                  "session",
                  sessionId,
                  opencodeSession.id,
                ],
              },
              (current) => (current ? { ...current, messages } : current),
            );
          } catch (error) {
            if (!disposed) {
              console.error(
                `Could not sync messages for OpenCode session ${opencodeSession.id}`,
                error,
              );
            }
          }
        }),
      );
    };

    const hydrateStatuses = async () => {
      const eventVersions = new Map(
        opencodeSessions.map((opencodeSession) => [
          opencodeSession.id,
          statusEventVersionsRef.current.get(opencodeSession.id) ?? 0,
        ]),
      );

      try {
        const statuses = await getOpencodeSessionStatuses(
          sessionId,
          opencodeSessions,
          serverUrl,
          accessToken,
          opencodePassword,
        );
        if (disposed) return;

        const chatsStore = useSessionChatsStore.getState();
        for (const opencodeSession of opencodeSessions) {
          if (
            eventVersions.get(opencodeSession.id) !== 0 ||
            (statusEventVersionsRef.current.get(opencodeSession.id) ?? 0) !==
              eventVersions.get(opencodeSession.id)
          ) {
            continue;
          }

          chatsStore.setChatStatus(
            sessionId,
            opencodeSession.id,
            statuses[opencodeSession.id] ?? { type: "idle" },
          );
        }
      } catch (error) {
        if (!disposed) {
          console.error(
            `Could not sync OpenCode statuses for project session ${sessionId}`,
            error,
          );
        }
      }
    };

    void hydrateMessages();
    void hydrateStatuses();

    return () => {
      disposed = true;
    };
  }, [
    accessToken,
    isOpencodeRunning,
    opencodePassword,
    opencodeSessions,
    queryClient,
    serverUrl,
    sessionId,
  ]);

  useEffect(() => {
    if (!isOpencodeRunning || !serverUrl || !accessToken) return;

    let disposed = false;
    let streamController: AbortController | null = null;

    const handleEvent = (event: Event) => {
      const opencodeSessionId = getEventSessionId(event);
      const chatsStore = useSessionChatsStore.getState();

      if (
        opencodeSessionId &&
        (event.type === "session.status" ||
          event.type === "session.idle" ||
          event.type === "session.error" ||
          event.type === "session.deleted")
      ) {
        statusEventVersionsRef.current.set(
          opencodeSessionId,
          (statusEventVersionsRef.current.get(opencodeSessionId) ?? 0) + 1,
        );
      }

      if (
        event.type === "session.created" ||
        event.type === "session.updated"
      ) {
        if (event.properties.info.parentID) {
          chatsStore.deleteSessionChat(sessionId, event.properties.info.id);
        } else {
          chatsStore.upsertSessionChat(sessionId, event.properties.info);
        }
      } else if (event.type === "session.deleted") {
        chatsStore.deleteSessionChat(sessionId, event.properties.sessionID);
      }

      const isRootChat = opencodeSessionId
        ? chatsStore
            .getSessionChats(sessionId)
            .some((chat) => chat.id === opencodeSessionId)
        : false;

      if (opencodeSessionId && isRootChat) {
        if (
          event.type === "message.updated" &&
          event.properties.info.role === "assistant" &&
          event.properties.info.time.completed
        ) {
          const completionKey = `${opencodeSessionId}:${event.properties.info.id}:${event.properties.info.time.completed}`;
          if (!handledCompletedAnswersRef.current.has(completionKey)) {
            handledCompletedAnswersRef.current.add(completionKey);
            markAnswerUnreadIfNotViewing(
              chatsStore,
              activeChatRef.current,
              sessionId,
              opencodeSessionId,
            );
          }
        }

        const currentMessages = chatsStore.getChatMessages(
          sessionId,
          opencodeSessionId,
        );
        const messages = reduceOpencodeMessages(
          currentMessages,
          event,
          opencodeSessionId,
        );
        if (messages !== currentMessages) {
          chatsStore.setChatMessages(sessionId, opencodeSessionId, messages);
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
          chatsStore.setChatStatus(
            sessionId,
            opencodeSessionId,
            event.properties.status,
          );
        } else if (
          event.type === "session.idle" ||
          event.type === "session.error"
        ) {
          chatsStore.setChatStatus(sessionId, opencodeSessionId, {
            type: "idle",
          });
        }
      }

      if (event.type === "session.idle" && opencodeSessionId) {
        void queryClient.invalidateQueries({
          queryKey: ["opencode", "session", sessionId, opencodeSessionId],
        });
      }

      if (
        event.type === "session.created" ||
        event.type === "session.updated" ||
        event.type === "session.deleted"
      ) {
        void queryClient.invalidateQueries({
          queryKey: ["opencode", "chat-sessions", sessionId, serverUrl],
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
            opencodePassword,
            signal,
            handleEvent,
            () => {
              void refreshStatuses();
              void queryClient.invalidateQueries({
                queryKey: [
                  "opencode",
                  "chat-sessions",
                  sessionId,
                  serverUrl,
                ],
                exact: true,
              });
              resyncActiveChat();
            },
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
          await new Promise((resolve) => window.setTimeout(resolve, 1_000));
        }
      }
    };

    const refreshStatuses = async () => {
      const chats = useSessionChatsStore.getState().getSessionChats(sessionId);
      if (!chats.length) return;

      const eventVersions = new Map(
        chats.map((chat) => [
          chat.id,
          statusEventVersionsRef.current.get(chat.id) ?? 0,
        ]),
      );

      try {
        const statuses = await getOpencodeSessionStatuses(
          sessionId,
          chats,
          serverUrl,
          accessToken,
          opencodePassword,
        );
        if (disposed) return;

        const chatsStore = useSessionChatsStore.getState();
        for (const chat of chats) {
          if (
            (statusEventVersionsRef.current.get(chat.id) ?? 0) !==
            eventVersions.get(chat.id)
          ) {
            continue;
          }

          chatsStore.setChatStatus(
            sessionId,
            chat.id,
            statuses[chat.id] ?? { type: "idle" },
          );
        }
      } catch (error) {
        if (!disposed) {
          console.error(
            `Could not refresh OpenCode statuses for project session ${sessionId}`,
            error,
          );
        }
      }
    };

    const startStream = () => {
      streamController?.abort();
      streamController = new AbortController();
      void connect(streamController.signal);
    };

    const resyncActiveChat = () => {
      const activeChat = activeChatRef.current;
      if (
        activeChat.projectSessionId !== sessionId ||
        !activeChat.opencodeSessionId
      ) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: [
          "opencode",
          "session",
          sessionId,
          activeChat.opencodeSessionId,
          serverUrl,
        ],
        exact: true,
      });
    };

    const reconnectWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      const activeChat = activeChatRef.current;
      if (
        activeChat.projectSessionId === sessionId &&
        activeChat.opencodeSessionId
      ) {
        useSessionChatsStore
          .getState()
          .setChatUnread(sessionId, activeChat.opencodeSessionId, false);
      }
      startStream();
      void queryClient.invalidateQueries({
        queryKey: ["opencode", "chat-sessions", sessionId, serverUrl],
        exact: true,
      });
      resyncActiveChat();
    };

    startStream();
    document.addEventListener("visibilitychange", reconnectWhenVisible);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", reconnectWhenVisible);
      streamController?.abort();
    };
  }, [
    accessToken,
    isOpencodeRunning,
    opencodePassword,
    queryClient,
    serverUrl,
    sessionId,
  ]);

  useEffect(() => {
    if (isPending) {
      updateSession(sessionId, { instanceSyncState: "pending" });
      return;
    }

    if (!instance) {
      updateSession(sessionId, {
        instance: null,
        state: "stopped",
        instanceSyncState: isError ? "error" : "success",
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
    isError,
    isOpencodeRunning,
    isPending,
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
  const sessionID = properties?.sessionID;
  return typeof sessionID === "string" ? sessionID : undefined;
}

function markAnswerUnreadIfNotViewing(
  chatsStore: ReturnType<typeof useSessionChatsStore.getState>,
  activeChat: {
    projectSessionId?: string;
    opencodeSessionId?: string;
  },
  projectSessionId: string,
  opencodeSessionId: string,
) {
  const isViewingChat =
    document.visibilityState === "visible" &&
    activeChat.projectSessionId === projectSessionId &&
    activeChat.opencodeSessionId === opencodeSessionId;

  if (!isViewingChat) {
    chatsStore.setChatUnread(projectSessionId, opencodeSessionId, true);
  }
}

export function PlaygroundStoreSync() {
  const { data: projectsWithSessions } = useGetProjectsWithSessions();
  const sessions = useSessionsStore((store) => store.sessions);
  const addAllProjects = useProjectsStore((store) => store.addAllProjects);
  const addAllSessions = useSessionsStore((store) => store.addAllSessions);

  useEffect(() => {
    if (!projectsWithSessions) return;

    const projects = projectsWithSessions.map((projectWithSessions) => {
      const project = { ...projectWithSessions };
      delete (project as Partial<typeof project>).sessions;
      return project;
    });

    addAllProjects(projects);

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

  return sessions.map(({ session }) => (
    <ProjectSessionRuntimeSync key={session.id} sessionId={session.id} />
  ));
}
