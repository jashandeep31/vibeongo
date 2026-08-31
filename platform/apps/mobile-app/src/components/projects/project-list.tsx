import type { Project } from "@repo/api-client";
import {
  useArchiveProjectSession,
  useDeleteProject,
  useGetInstances,
  useGetProjectGithubReposById,
  useGetProjectsWithSessions,
  useResumeProjectSession,
  useTerminateInstance,
} from "@repo/api-hooks";
import {
  useProjectsStore,
  useSessionChatsStore,
  useSessionsStore,
} from "@repo/app-store";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  type GestureResponderEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { ConfirmationDrawer } from "@/components/confirmation-drawer";
import { CreateProjectSessionDrawer } from "@/components/projects/create-project-session-drawer";
import { ProjectActionsMenu } from "@/components/projects/project-actions-menu";
import { RepositoryDrawer } from "@/components/projects/repository-drawer";
import {
  SessionRuntimeDrawer,
  type SessionRuntime,
} from "@/components/projects/session-runtime-drawer";
import { Fonts } from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useTheme } from "@/hooks/use-theme";
import {
  formatInstanceTimeRemaining,
  getInstanceRemainingMs,
  isInstanceExpiringSoon,
} from "@/lib/instance-expiry";

type TerminationTarget = {
  instanceId: string;
  projectId: string;
  sessionId: string;
  sessionName: string;
};

type NewChatTarget = {
  projectId: string;
  sessionId: string;
};

type SessionActionTarget = {
  id: string;
  name: string;
};

function getApiError(error: unknown) {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return { message: null, status: null };
  }

  const response = (
    error as {
      response?: { data?: { message?: unknown }; status?: unknown };
    }
  ).response;
  return {
    message:
      typeof response?.data?.message === "string"
        ? response.data.message
        : null,
    status: typeof response?.status === "number" ? response.status : null,
  };
}

export function ProjectList({ topInset = 0 }: { topInset?: number }) {
  const theme = useTheme();
  const router = useRouter();
  const projectsQuery = useGetProjectsWithSessions();
  const projects = useProjectsStore((store) => store.projects);
  const sessions = useSessionsStore((store) => store.sessions);
  const chatsBySessionId = useSessionChatsStore(
    (store) => store.chatsBySessionId,
  );
  const statusesBySessionId = useSessionChatsStore(
    (store) => store.statusesBySessionId,
  );
  const unreadBySessionId = useSessionChatsStore(
    (store) => store.unreadBySessionId,
  );
  const attentionBySessionId = useSessionChatsStore(
    (store) => store.attentionBySessionId,
  );
  const resumeSession = useResumeProjectSession();
  const archiveSession = useArchiveProjectSession();
  const deleteProject = useDeleteProject();
  const [runtimeSessionId, setRuntimeSessionId] = useState<string | null>(null);
  const [resumingSessionId, setResumingSessionId] = useState<string | null>(
    null,
  );
  const [terminationTarget, setTerminationTarget] =
    useState<TerminationTarget | null>(null);
  const [isTerminationConfirmationOpen, setIsTerminationConfirmationOpen] =
    useState(false);
  const [terminatingInstanceId, setTerminatingInstanceId] = useState<
    string | null
  >(null);
  const [newChatTarget, setNewChatTarget] = useState<NewChatTarget | null>(
    null,
  );
  const [isRepositoryDrawerOpen, setIsRepositoryDrawerOpen] = useState(false);
  const [projectMenu, setProjectMenu] = useState<{
    project: Project;
    anchorY: number;
  } | null>(null);
  const [newSessionProject, setNewSessionProject] = useState<Project | null>(
    null,
  );
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [sessionToArchive, setSessionToArchive] =
    useState<SessionActionTarget | null>(null);
  const repositoriesQuery = useGetProjectGithubReposById(
    newChatTarget?.projectId ?? null,
    Boolean(newChatTarget),
  );
  const terminateInstance = useTerminateInstance(
    terminationTarget?.projectId ?? "",
    terminationTarget?.sessionId ?? "",
  );
  const instancesQuery = useGetInstances(
    { state: "running", limit: 100 },
    Boolean(projectsQuery.data),
  );
  const hasRunningInstances = sessions.some(
    (entry) => entry.state === "running" && entry.instance,
  );
  const now = useCurrentTime(hasRunningInstances);

  const openNewChat = useCallback(
    (directory: string) => {
      if (!newChatTarget) return;

      const target = newChatTarget;
      setIsRepositoryDrawerOpen(false);
      setNewChatTarget(null);
      requestAnimationFrame(() => {
        router.push({
          pathname:
            "/projects/[projectId]/sessions/[projectSessionId]/new-chat",
          params: {
            directory,
            projectId: target.projectId,
            projectSessionId: target.sessionId,
          },
        });
      });
    },
    [newChatTarget, router],
  );

  useEffect(() => {
    if (!newChatTarget) return;
    if (repositoriesQuery.isError) {
      setIsRepositoryDrawerOpen(true);
      return;
    }
    if (!repositoriesQuery.isSuccess) return;

    const repositories = repositoriesQuery.data ?? [];
    if (repositories.length === 1) {
      const repository = repositories[0];
      if (!repository) return;
      const name =
        repository.full_name.split("/").filter(Boolean).at(-1) ??
        repository.full_name;
      openNewChat(`/home/ubuntu/code/${name}`);
      return;
    }

    setIsRepositoryDrawerOpen(true);
  }, [
    newChatTarget,
    openNewChat,
    repositoriesQuery.data,
    repositoriesQuery.isError,
    repositoriesQuery.isSuccess,
  ]);

  const handleRuntimeSelect = (runtime: SessionRuntime) => {
    if (!runtimeSessionId) return;

    const sessionId = runtimeSessionId;
    setRuntimeSessionId(null);
    setResumingSessionId(sessionId);
    resumeSession.mutate(
      { id: sessionId, runtime },
      {
        onError: (error) => {
          const apiError = getApiError(error);
          if (apiError.status === 402) {
            Toast.show({
              type: "error",
              text1: "Instance limit reached",
              text2: `${apiError.message ?? "Upgrade your tier or stop a running session before launching another instance."} Tap to view limits.`,
              onPress: () => {
                Toast.hide();
                router.push("/limits");
              },
              visibilityTime: 5000,
            });
            return;
          }

          if (
            apiError.message?.toLowerCase().startsWith("insufficient balance")
          ) {
            Toast.show({
              type: "error",
              text1: "Insufficient balance",
              text2: `${apiError.message} Tap to open your wallet.`,
              onPress: () => {
                Toast.hide();
                router.push("/wallet");
              },
              visibilityTime: 5000,
            });
            return;
          }

          Toast.show({
            type: "error",
            text1: "Could not resume session",
            text2:
              apiError.message ?? "Please check your connection and try again.",
          });
        },
        onSettled: () => setResumingSessionId(null),
      },
    );
  };

  const handleTerminate = () => {
    if (!terminationTarget) return;

    const instanceId = terminationTarget.instanceId;
    setIsTerminationConfirmationOpen(false);
    setTerminatingInstanceId(instanceId);
    terminateInstance.mutate(instanceId, {
      onError: () => {
        Alert.alert(
          "Could not terminate instance",
          "Please check your connection and try again.",
        );
      },
      onSettled: () => {
        setTerminatingInstanceId(null);
        setTerminationTarget(null);
      },
    });
  };

  const openProjectMenu = (event: GestureResponderEvent, project: Project) => {
    setProjectMenu({ project, anchorY: event.nativeEvent.pageY });
  };

  const handleDeleteProject = () => {
    if (!projectToDelete || deleteProject.isPending) return;
    deleteProject.mutate(projectToDelete.id, {
      onError: () => {
        Alert.alert(
          "Could not delete project",
          "Please check your connection and try again.",
        );
      },
      onSuccess: () => setProjectToDelete(null),
    });
  };

  const handleArchiveSession = () => {
    if (!sessionToArchive || archiveSession.isPending) return;
    archiveSession.mutate(
      { id: sessionToArchive.id, action: true },
      {
        onError: () => {
          setSessionToArchive(null);
          requestAnimationFrame(() =>
            Toast.show({
              type: "error",
              text1: "Could not archive session",
              text2: "Please check your connection and try again.",
            }),
          );
        },
        onSuccess: () => setSessionToArchive(null),
      },
    );
  };

  if (
    projectsQuery.isPending ||
    (Boolean(projectsQuery.data?.length) && projects.length === 0)
  ) {
    return (
      <View style={[styles.centeredState, { paddingTop: topInset + 72 }]}>
        <ActivityIndicator />
        <ThemedText themeColor="textSecondary">Loading projects…</ThemedText>
      </View>
    );
  }

  if (projectsQuery.isError) {
    return (
      <View style={[styles.centeredState, { paddingTop: topInset + 72 }]}>
        <ThemedText style={styles.emptyTitle}>
          Could not load projects
        </ThemedText>
        <ThemedText style={styles.emptyDescription} themeColor="textSecondary">
          Check your connection and try again.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => void projectsQuery.refetch()}
          style={({ pressed }) => [
            styles.retryButton,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.retryLabel}>Try again</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (projects.length === 0) {
    return (
      <View style={[styles.centeredState, { paddingTop: topInset + 72 }]}>
        <ThemedText style={styles.emptyTitle}>No projects yet</ThemedText>
        <ThemedText style={styles.emptyDescription} themeColor="textSecondary">
          Your projects and sessions will appear here.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/projects/create")}
          style={({ pressed }) => [
            styles.emptyCreateButton,
            { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: "plus", android: "add" }}
            size={16}
            tintColor={theme.background}
          />
          <ThemedText
            style={[styles.emptyCreateLabel, { color: theme.background }]}
          >
            New project
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topInset }]}
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void Promise.all([
                projectsQuery.refetch(),
                instancesQuery.refetch(),
              ]);
            }}
            refreshing={
              projectsQuery.isRefetching || instancesQuery.isRefetching
            }
            tintColor={theme.textSecondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {projects.map((project) => (
          <View
            key={project.id}
            style={[styles.project, { borderColor: theme.backgroundSelected }]}
          >
            <View style={styles.projectHeader}>
              <ThemedText numberOfLines={1} style={styles.projectName}>
                {project.name}
              </ThemedText>
              <Pressable
                accessibilityLabel={`More actions for ${project.name}`}
                accessibilityRole="button"
                hitSlop={6}
                onPress={(event) => openProjectMenu(event, project)}
                style={({ pressed }) => [
                  styles.projectActions,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: "ellipsis", android: "more_vert" }}
                  size={19}
                  tintColor={theme.textSecondary}
                  weight="medium"
                />
              </Pressable>
            </View>

            {sessions.filter((entry) => entry.session.project_id === project.id)
              .length === 0 ? (
              <ThemedText style={styles.noSessions} themeColor="textSecondary">
                This project does not have any sessions yet.
              </ThemedText>
            ) : (
              <View>
                {sessions
                  .filter((entry) => entry.session.project_id === project.id)
                  .map((entry) => {
                    const session = entry.session;
                    const runningInstance = entry.instance;
                    const isRunning = entry.state === "running";
                    const isResuming = resumingSessionId === entry.session.id;
                    const isTerminating =
                      terminatingInstanceId === runningInstance?.id;
                    const opencodeChats = chatsBySessionId[session.id] ?? [];
                    const isStartingNewChat =
                      newChatTarget?.sessionId === session.id &&
                      repositoriesQuery.isFetching;
                    const remainingMs = getInstanceRemainingMs(
                      runningInstance?.terminates_at,
                      now,
                    );
                    const isExpiringSoon =
                      isRunning && isInstanceExpiringSoon(remainingMs);

                    return (
                      <View key={session.id}>
                        <View style={styles.sessionRow}>
                          <SymbolView
                            name={{
                              ios: isRunning ? "chevron.down" : "chevron.right",
                              android: isRunning
                                ? "keyboard_arrow_down"
                                : "chevron_right",
                            }}
                            size={14}
                            tintColor={theme.textSecondary}
                          />
                          <ThemedText
                            numberOfLines={1}
                            style={styles.sessionName}
                            themeColor="textSecondary"
                          >
                            {session.name}
                          </ThemedText>
                          <View style={styles.sessionControls}>
                            {entry.state !== "stopped" ? (
                              <View
                                accessibilityLabel={
                                  isRunning ? "Running" : "Starting"
                                }
                                style={[
                                  styles.statusDot,
                                  {
                                    backgroundColor: isRunning
                                      ? "#10b981"
                                      : "#f59e0b",
                                  },
                                ]}
                              />
                            ) : null}
                            {runningInstance ? (
                              <>
                                <Pressable
                                  accessibilityLabel={`Open terminal for ${session.name}`}
                                  accessibilityRole="button"
                                  onPress={() =>
                                    router.push({
                                      pathname:
                                        "/projects/[projectId]/sessions/[projectSessionId]/terminal",
                                      params: {
                                        projectId: project.id,
                                        projectSessionId: session.id,
                                      },
                                    })
                                  }
                                  style={({ pressed }) => [
                                    styles.sessionAction,
                                    pressed && styles.pressed,
                                  ]}
                                >
                                  <SymbolView
                                    name={{
                                      ios: "apple.terminal",
                                      android: "terminal",
                                    }}
                                    size={16}
                                    tintColor={theme.textSecondary}
                                  />
                                </Pressable>
                                <Pressable
                                  accessibilityLabel={`Terminate ${session.name}`}
                                  accessibilityRole="button"
                                  disabled={terminateInstance.isPending}
                                  onPress={() => {
                                    setTerminationTarget({
                                      instanceId: runningInstance.id,
                                      projectId: project.id,
                                      sessionId: session.id,
                                      sessionName: session.name,
                                    });
                                    setIsTerminationConfirmationOpen(true);
                                  }}
                                  style={({ pressed }) => [
                                    styles.sessionAction,
                                    (pressed || terminateInstance.isPending) &&
                                      styles.pressed,
                                  ]}
                                >
                                  {isTerminating ? (
                                    <ActivityIndicator
                                      color="#ef4444"
                                      size="small"
                                    />
                                  ) : (
                                    <SymbolView
                                      name={{
                                        ios: "stop.fill",
                                        android: "stop_circle",
                                      }}
                                      size={14}
                                      tintColor="#ef4444"
                                    />
                                  )}
                                </Pressable>
                              </>
                            ) : entry.state === "processing" ? (
                              <ActivityIndicator size="small" />
                            ) : (
                              <>
                                <Pressable
                                  accessibilityLabel={`Resume ${session.name}`}
                                  accessibilityRole="button"
                                  disabled={
                                    resumeSession.isPending ||
                                    archiveSession.isPending
                                  }
                                  onPress={() =>
                                    setRuntimeSessionId(session.id)
                                  }
                                  style={({ pressed }) => [
                                    styles.sessionAction,
                                    (pressed ||
                                      resumeSession.isPending ||
                                      archiveSession.isPending) &&
                                      styles.pressed,
                                  ]}
                                >
                                  {isResuming ? (
                                    <ActivityIndicator size="small" />
                                  ) : (
                                    <SymbolView
                                      name={{
                                        ios: "play.fill",
                                        android: "play_arrow",
                                      }}
                                      size={17}
                                      tintColor={theme.text}
                                    />
                                  )}
                                </Pressable>
                                <Pressable
                                  accessibilityLabel={`Archive ${session.name}`}
                                  accessibilityRole="button"
                                  disabled={archiveSession.isPending}
                                  onPress={() =>
                                    setSessionToArchive({
                                      id: session.id,
                                      name: session.name,
                                    })
                                  }
                                  style={({ pressed }) => [
                                    styles.sessionAction,
                                    (pressed || archiveSession.isPending) &&
                                      styles.pressed,
                                  ]}
                                >
                                  <SymbolView
                                    name={{
                                      ios: "archivebox",
                                      android: "archive",
                                    }}
                                    size={17}
                                    tintColor={theme.textSecondary}
                                  />
                                </Pressable>
                              </>
                            )}
                          </View>
                        </View>

                        {isExpiringSoon ? (
                          <View
                            accessibilityLabel={`${session.name} ends in ${formatInstanceTimeRemaining(remainingMs)}`}
                            style={styles.expiryWarning}
                          >
                            <SymbolView
                              name={{
                                ios: "exclamationmark.triangle.fill",
                                android: "warning",
                              }}
                              size={14}
                              tintColor="#f59e0b"
                            />
                            <ThemedText style={styles.expiryWarningLabel}>
                              Session ends soon
                            </ThemedText>
                            <ThemedText style={styles.expiryCountdown}>
                              {formatInstanceTimeRemaining(remainingMs)}
                            </ThemedText>
                          </View>
                        ) : null}

                        {isRunning ? (
                          <View style={styles.opencodeChats}>
                            {opencodeChats.map((chat) => {
                              const status =
                                statusesBySessionId[session.id]?.[chat.id];
                              const isBusy = status?.type !== "idle" && status;
                              const isUnread =
                                unreadBySessionId[session.id]?.[chat.id] ===
                                true;
                              const needsAttention =
                                attentionBySessionId[session.id]?.[chat.id] ===
                                true;
                              const stateLabel = needsAttention
                                ? "Needs attention"
                                : isBusy
                                  ? "Working"
                                  : isUnread
                                    ? "New answer"
                                    : undefined;
                              return (
                                <Pressable
                                  accessibilityRole="button"
                                  key={chat.id}
                                  onPress={() =>
                                    router.push({
                                      pathname:
                                        "/projects/[projectId]/sessions/[projectSessionId]/chats/[opencodeSessionId]",
                                      params: {
                                        opencodeSessionId: chat.id,
                                        projectId: project.id,
                                        projectSessionId: session.id,
                                      },
                                    })
                                  }
                                  style={({ pressed }) => [
                                    styles.chatRow,
                                    pressed && {
                                      backgroundColor: theme.backgroundElement,
                                    },
                                  ]}
                                >
                                  <SymbolView
                                    name={{
                                      ios: "bubble.left",
                                      android: "chat_bubble_outline",
                                    }}
                                    size={14}
                                    tintColor={theme.textSecondary}
                                  />
                                  <ThemedText
                                    numberOfLines={1}
                                    style={[
                                      styles.chatTitle,
                                      (isUnread || needsAttention) &&
                                        styles.unreadChatTitle,
                                    ]}
                                    themeColor={
                                      isUnread || needsAttention
                                        ? "text"
                                        : "textSecondary"
                                    }
                                  >
                                    {chat.title || "Untitled chat"}
                                  </ThemedText>
                                  {stateLabel ? (
                                    <View
                                      accessibilityLabel={stateLabel}
                                      style={[
                                        styles.chatIndicator,
                                        {
                                          backgroundColor: needsAttention
                                            ? "#ef4444"
                                            : isBusy
                                              ? "#f59e0b"
                                              : "#3b82f6",
                                        },
                                      ]}
                                    />
                                  ) : null}
                                </Pressable>
                              );
                            })}
                            <Pressable
                              accessibilityLabel={`New chat in ${session.name}`}
                              accessibilityRole="button"
                              disabled={Boolean(newChatTarget)}
                              onPress={() => {
                                setNewChatTarget({
                                  projectId: project.id,
                                  sessionId: session.id,
                                });
                                setIsRepositoryDrawerOpen(true);
                              }}
                              style={({ pressed }) => [
                                styles.chatRow,
                                pressed && {
                                  backgroundColor: theme.backgroundElement,
                                },
                              ]}
                            >
                              {isStartingNewChat ? (
                                <ActivityIndicator size="small" />
                              ) : (
                                <SymbolView
                                  name={{ ios: "plus", android: "add" }}
                                  size={15}
                                  tintColor={theme.textSecondary}
                                />
                              )}
                              <ThemedText
                                style={styles.newChatLabel}
                                themeColor="textSecondary"
                              >
                                New chat
                              </ThemedText>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <SessionRuntimeDrawer
        onClose={() => setRuntimeSessionId(null)}
        onSelect={handleRuntimeSelect}
        visible={runtimeSessionId !== null}
      />
      <ProjectActionsMenu
        anchorY={projectMenu?.anchorY ?? 0}
        onClose={() => setProjectMenu(null)}
        onDelete={(project) => {
          setProjectMenu(null);
          setProjectToDelete(project);
        }}
        onEdit={(project) => {
          setProjectMenu(null);
          router.push({
            pathname: "/projects/[projectId]/edit",
            params: { projectId: project.id },
          });
        }}
        onNewSession={(project) => {
          setProjectMenu(null);
          setNewSessionProject(project);
        }}
        project={projectMenu?.project ?? null}
      />
      <CreateProjectSessionDrawer
        onClose={() => setNewSessionProject(null)}
        project={newSessionProject}
      />
      <ConfirmationDrawer
        confirmLabel="Archive"
        description={`Archive "${sessionToArchive?.name ?? "this session"}"? It will be hidden from your active sessions list.`}
        isConfirming={archiveSession.isPending}
        onCancel={() => {
          if (!archiveSession.isPending) setSessionToArchive(null);
        }}
        onConfirm={handleArchiveSession}
        title="Archive session?"
        visible={Boolean(sessionToArchive)}
      />
      <ConfirmationDrawer
        confirmDelaySeconds={3}
        confirmLabel="Delete project"
        description={`Delete "${projectToDelete?.name ?? "this project"}"? All of its sessions and data will be permanently removed.`}
        isConfirming={deleteProject.isPending}
        onCancel={() => {
          if (!deleteProject.isPending) setProjectToDelete(null);
        }}
        onConfirm={handleDeleteProject}
        title="Delete project?"
        visible={Boolean(projectToDelete)}
      />
      <ConfirmationDrawer
        confirmDelaySeconds={1}
        confirmLabel="Terminate"
        description={`The running instance for "${terminationTarget?.sessionName ?? "this session"}" will stop immediately. Any unsaved work may be lost.`}
        onCancel={() => {
          setIsTerminationConfirmationOpen(false);
          setTerminationTarget(null);
        }}
        onConfirm={handleTerminate}
        title="Terminate this instance?"
        visible={isTerminationConfirmationOpen}
      />
      <RepositoryDrawer
        error={repositoriesQuery.isError}
        loading={repositoriesQuery.isPending}
        onClose={() => {
          setIsRepositoryDrawerOpen(false);
          setNewChatTarget(null);
        }}
        onSelect={openNewChat}
        repositories={repositoriesQuery.data ?? []}
        visible={isRepositoryDrawerOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  chatIndicator: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  chatRow: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 9,
    minHeight: 36,
    paddingHorizontal: 8,
  },
  chatTitle: {
    flex: 1,
    fontSize: 13,
  },
  content: {
    paddingBottom: 48,
  },
  emptyDescription: {
    lineHeight: 22,
    textAlign: "center",
  },
  emptyCreateButton: {
    alignItems: "center",
    borderRadius: 11,
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  emptyCreateLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  expiryCountdown: {
    color: "#f59e0b",
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: "700",
  },
  expiryWarning: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.45)",
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 7,
    marginBottom: 5,
    marginLeft: 24,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  expiryWarningLabel: {
    color: "#f59e0b",
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  noSessions: {
    fontSize: 14,
    lineHeight: 22,
    paddingBottom: 8,
    paddingLeft: 26,
    paddingTop: 14,
  },
  newChatLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  opencodeChats: {
    marginBottom: 6,
    paddingLeft: 24,
  },
  pressed: {
    opacity: 0.7,
  },
  project: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 28,
    paddingBottom: 24,
  },
  projectHeader: {
    alignItems: "center",
    flexDirection: "row",
    paddingBottom: 2,
  },
  projectActions: {
    alignItems: "center",
    borderRadius: 9,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  projectName: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
    textTransform: "uppercase",
  },
  retryButton: {
    borderRadius: 10,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  sessionAction: {
    alignItems: "center",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  sessionControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  sessionName: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
    textTransform: "capitalize",
  },
  sessionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 36,
    paddingLeft: 2,
  },
  statusDot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  unreadChatTitle: {
    fontWeight: "700",
  },
});
