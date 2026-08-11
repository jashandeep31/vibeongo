import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { Radius, Spacing, TouchTarget } from "@/constants/theme";
import { useWebSocket } from "@/contexts/websocket-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

import {
  archiveProjectSession,
  createProjectSession,
  deleteChat,
  getHomeData,
  getProjectGithubRepos,
  resumeProjectSession,
  terminateInstance,
} from "./home-api";
import { MobileSidebar } from "./mobile-sidebar";
import {
  NewSessionSheet,
  RepositorySheet,
  RuntimeSheet,
} from "./project-session-modals";
import type {
  HomeData,
  OpencodeChat,
  Project,
  ProjectGithubRepo,
  ProjectSession,
  ProjectSessionRuntimeKind,
  RecentChat,
} from "./types";
import { WorkComposer } from "./work-composer";
import { WorkspaceSection, type WorkspaceTab } from "./workspace-section";

const LOW_BALANCE_THRESHOLD = 5 * 10_000_000;

export function HomeScreen() {
  const router = useRouter();
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const { isConnected, sendJsonMessage, subscribeJsonMessage } = useWebSocket();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("chats");
  const [newSessionProject, setNewSessionProject] = useState<Project | null>(
    null,
  );
  const [runtimeSession, setRuntimeSession] = useState<ProjectSession | null>(
    null,
  );
  const [repositorySession, setRepositorySession] =
    useState<ProjectSession | null>(null);
  const [repositoryProject, setRepositoryProject] = useState<Project | null>(
    null,
  );
  const [repositories, setRepositories] = useState<ProjectGithubRepo[]>([]);
  const [repositoryError, setRepositoryError] = useState<string | null>(null);
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(false);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal, refreshing = false, quiet = false) => {
      if (refreshing) setIsRefreshing(true);
      else if (!quiet) setIsLoading(true);
      if (!quiet) setError(null);

      try {
        const homeData = await getHomeData(signal);
        setData(homeData);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError")
          return;
        if (!quiet) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load your workspace.",
          );
        }
      } finally {
        if (!signal?.aborted && !quiet) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const hasProcessingSession = data?.projects.some((project) =>
    project.sessions.some((session) => session.runtime?.state === "processing"),
  );

  useEffect(() => {
    if (!hasProcessingSession) return;
    const interval = setInterval(() => void load(undefined, false, true), 5000);
    return () => clearInterval(interval);
  }, [hasProcessingSession, load]);

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
          setIsCreatingChat(false);
          router.push(`/chat/${message.data.chatId}`);
          return;
        }

        if (message.type === "error") {
          setIsCreatingChat(false);
          Alert.alert("Could not create the chat", "Please try again.");
        }
      }),
    [router, subscribeJsonMessage],
  );

  const createChat = (payload: {
    message: string;
    tagged: Array<{ type: "project"; data: { id: string; name: string } }>;
  }) => {
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
      Alert.alert("Chat service is connecting", "Wait a moment and try again.");
      return false;
    }
    setIsCreatingChat(true);
    return true;
  };

  const confirmDeleteChat = (chat: RecentChat) => {
    Alert.alert(
      "Delete chat?",
      `“${chat.name}” and its conversation history will be permanently deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingChatId(chat.id);
            try {
              await deleteChat(chat.id);
              setData((current) =>
                current
                  ? {
                      ...current,
                      chats: current.chats.filter(
                        (item) => item.id !== chat.id,
                      ),
                    }
                  : current,
              );
            } catch (deleteError) {
              Alert.alert(
                "Could not delete chat",
                deleteError instanceof Error
                  ? deleteError.message
                  : "Please try again.",
              );
            } finally {
              setDeletingChatId(null);
            }
          },
        },
      ],
    );
  };

  const runSessionAction = async (
    sessionId: string,
    action: () => Promise<unknown>,
    failureTitle: string,
  ) => {
    setActionPendingId(sessionId);
    try {
      await action();
      await load(undefined, false, true);
    } catch (actionError) {
      Alert.alert(
        failureTitle,
        actionError instanceof Error
          ? actionError.message
          : "Please try again.",
      );
    } finally {
      setActionPendingId(null);
    }
  };

  const submitNewSession = async (name: string, description: string) => {
    if (!newSessionProject) return;
    const project = newSessionProject;
    setActionPendingId(`create:${project.id}`);
    try {
      await createProjectSession(project.id, name, description || undefined);
      setNewSessionProject(null);
      await load(undefined, false, true);
    } catch (createError) {
      Alert.alert(
        "Could not create session",
        createError instanceof Error
          ? createError.message
          : "Please try again.",
      );
    } finally {
      setActionPendingId(null);
    }
  };

  const selectRuntime = (runtime: ProjectSessionRuntimeKind) => {
    if (!runtimeSession) return;
    const session = runtimeSession;
    void runSessionAction(
      session.id,
      () => resumeProjectSession(session.id, runtime),
      "Could not resume session",
    ).then(() => setRuntimeSession(null));
  };

  const confirmArchive = (session: ProjectSession) => {
    Alert.alert(
      "Archive session?",
      `Archive “${session.name}”? It will be hidden from your active sessions list.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: () =>
            void runSessionAction(
              session.id,
              () => archiveProjectSession(session.id),
              "Could not archive session",
            ),
        },
      ],
    );
  };

  const confirmTerminate = (session: ProjectSession) => {
    const instance = session.runtime?.instance;
    if (!instance) return;
    Alert.alert(
      "Terminate this instance?",
      "The running session will stop immediately. Any unsaved work may be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Terminate now",
          style: "destructive",
          onPress: () =>
            void runSessionAction(
              session.id,
              () => terminateInstance(instance.id),
              "Could not terminate instance",
            ),
        },
      ],
    );
  };

  const openOpencode = (
    project: Project,
    session: ProjectSession,
    directory?: string,
    chat?: OpencodeChat,
  ) => {
    router.push({
      pathname: "/opencode/[projectSessionId]" as never,
      params: {
        projectId: project.id,
        projectName: project.name,
        projectSessionId: session.id,
        sessionName: session.name,
        ...(directory ? { directory } : {}),
        ...(chat ? { opencodeSessionId: chat.id } : {}),
      },
    });
  };

  const loadRepositories = async (
    project: Project,
    session: ProjectSession,
  ) => {
    setRepositoryProject(project);
    setRepositorySession(session);
    setRepositories([]);
    setRepositoryError(null);
    setIsLoadingRepositories(true);
    try {
      const repos = await getProjectGithubRepos(project.id);
      if (repos.length === 1 && repos[0]) {
        const name =
          repos[0].full_name.split("/").filter(Boolean).at(-1) ??
          repos[0].full_name;
        setRepositorySession(null);
        setRepositoryProject(null);
        openOpencode(project, session, `/home/ubuntu/code/${name}`);
        return;
      }
      setRepositories(repos);
    } catch (repoError) {
      setRepositoryError(
        repoError instanceof Error
          ? repoError.message
          : "Could not load repositories.",
      );
    } finally {
      setIsLoadingRepositories(false);
    }
  };

  const balance = data?.user.balance;
  const isBalanceLow =
    typeof balance === "number" && balance < LOW_BALANCE_THRESHOLD;
  const hasNoBalance = typeof balance === "number" && balance <= 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <View style={styles.topBar}>
            <Pressable
              accessibilityLabel="Open navigation"
              accessibilityRole="button"
              onPress={() => setIsSidebarOpen(true)}
              style={({ pressed }) => [
                styles.menuButton,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <AppIcon
                name={{
                  ios: "line.3.horizontal",
                  android: "menu",
                  web: "menu",
                }}
                size={21}
                tintColor={colors.text}
              />
            </Pressable>
          </View>

          {isLoading && !data ? (
            <LoadingState colors={colors} />
          ) : error && !data ? (
            <ErrorState
              colors={colors}
              message={error}
              onRetry={() => void load()}
            />
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  colors={[colors.brand]}
                  onRefresh={() => void load(undefined, true)}
                  refreshing={isRefreshing}
                  tintColor={colors.brand}
                />
              }
              showsVerticalScrollIndicator={false}
            >
              <WorkComposer
                colors={colors}
                isConnected={isConnected}
                isSubmitting={isCreatingChat}
                onSubmit={createChat}
                projects={data?.projects ?? []}
              />

              {isBalanceLow ? (
                <View
                  accessibilityRole="alert"
                  style={[
                    styles.creditBanner,
                    {
                      backgroundColor: hasNoBalance
                        ? colors.destructiveSurface
                        : colors.warningSurface,
                    },
                  ]}
                >
                  <AppIcon
                    name={{
                      ios: "exclamationmark.triangle.fill",
                      android: "warning",
                      web: "warning",
                    }}
                    size={17}
                    tintColor={
                      hasNoBalance ? colors.destructive : colors.warning
                    }
                  />
                  <Text
                    style={[
                      styles.creditText,
                      {
                        color: hasNoBalance
                          ? colors.destructive
                          : colors.warning,
                      },
                    ]}
                  >
                    {hasNoBalance
                      ? "No credits remaining."
                      : "Your wallet balance is low."}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      Alert.alert(
                        "Wallet",
                        "The Wallet screen is planned after the Home flow.",
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.addCredits,
                        {
                          color: hasNoBalance
                            ? colors.destructive
                            : colors.warning,
                        },
                      ]}
                    >
                      Add credits
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <WorkspaceSection
                actionPendingId={actionPendingId}
                activeTab={activeTab}
                chats={data?.chats ?? []}
                colors={colors}
                deletingChatId={deletingChatId}
                onChangeTab={setActiveTab}
                onDeleteChat={confirmDeleteChat}
                onArchiveSession={confirmArchive}
                onCreateSession={setNewSessionProject}
                onNewOpencodeChat={(project, session) =>
                  void loadRepositories(project, session)
                }
                onOpenOpencodeChat={(project, session, chat) =>
                  openOpencode(project, session, chat.directory, chat)
                }
                onResumeSession={setRuntimeSession}
                onTerminateSession={confirmTerminate}
                projects={data?.projects ?? []}
              />
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
      <MobileSidebar
        colors={colors}
        onClose={() => setIsSidebarOpen(false)}
        onSelectWorkspace={setActiveTab}
        visible={isSidebarOpen}
      />
      <NewSessionSheet
        colors={colors}
        isPending={Boolean(
          newSessionProject &&
          actionPendingId === `create:${newSessionProject.id}`,
        )}
        onClose={() => {
          if (!actionPendingId) setNewSessionProject(null);
        }}
        onSubmit={(name, description) =>
          void submitNewSession(name, description)
        }
        project={newSessionProject}
      />
      <RuntimeSheet
        colors={colors}
        isPending={Boolean(
          runtimeSession && actionPendingId === runtimeSession.id,
        )}
        onClose={() => {
          if (!actionPendingId) setRuntimeSession(null);
        }}
        onSelect={selectRuntime}
        session={runtimeSession}
      />
      <RepositorySheet
        colors={colors}
        error={repositoryError}
        isLoading={isLoadingRepositories}
        onClose={() => {
          setRepositorySession(null);
          setRepositoryProject(null);
        }}
        onRetry={() => {
          if (repositoryProject && repositorySession) {
            void loadRepositories(repositoryProject, repositorySession);
          }
        }}
        onSelect={(repo) => {
          if (!repositoryProject || !repositorySession) return;
          const name =
            repo.full_name.split("/").filter(Boolean).at(-1) ?? repo.full_name;
          openOpencode(
            repositoryProject,
            repositorySession,
            `/home/ubuntu/code/${name}`,
          );
          setRepositorySession(null);
          setRepositoryProject(null);
        }}
        repos={repositories}
        session={repositorySession}
      />
    </View>
  );
}

function LoadingState({ colors }: { colors: ReturnType<typeof useTheme> }) {
  return (
    <View accessibilityLabel="Loading workspace" style={styles.loadingState}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Loading your workspace…
      </Text>
    </View>
  );
}

function ErrorState({
  colors,
  message,
  onRetry,
}: {
  colors: ReturnType<typeof useTheme>;
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.loadingState}>
      <View
        style={[
          styles.errorIcon,
          { backgroundColor: colors.destructiveSurface },
        ]}
      >
        <AppIcon
          name={{
            ios: "wifi.exclamationmark",
            android: "wifi_off",
            web: "wifi_off",
          }}
          size={25}
          tintColor={colors.destructive}
        />
      </View>
      <Text style={[styles.errorTitle, { color: colors.text }]}>
        Couldn&apos;t load your workspace
      </Text>
      <Text style={[styles.errorCopy, { color: colors.textSecondary }]}>
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
      >
        <AppIcon
          name={{ ios: "arrow.clockwise", android: "refresh", web: "refresh" }}
          size={17}
          tintColor={colors.primaryForeground}
        />
        <Text
          style={[styles.retryButtonText, { color: colors.primaryForeground }]}
        >
          Try again
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    height: 60,
    paddingHorizontal: Spacing.five,
  },
  menuButton: {
    alignItems: "center",
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    height: TouchTarget,
    justifyContent: "center",
    width: TouchTarget,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  scrollContent: {
    alignSelf: "center",
    maxWidth: 700,
    paddingBottom: Spacing.seven,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.two,
    width: "100%",
  },
  creditBanner: {
    alignItems: "center",
    borderBottomLeftRadius: Radius.large,
    borderBottomRightRadius: Radius.large,
    flexDirection: "row",
    gap: 8,
    marginHorizontal: Spacing.four,
    marginTop: -14,
    minHeight: 58,
    paddingBottom: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
  },
  creditText: { flex: 1, fontSize: 12, fontWeight: "500" },
  addCredits: {
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.seven,
  },
  loadingText: { fontSize: 14, marginTop: Spacing.four },
  errorIcon: {
    alignItems: "center",
    borderRadius: Radius.large,
    height: 54,
    justifyContent: "center",
    marginBottom: Spacing.four,
    width: 54,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.two,
    textAlign: "center",
  },
  errorCopy: {
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 320,
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    borderRadius: Radius.pill,
    flexDirection: "row",
    gap: 7,
    height: TouchTarget,
    marginTop: Spacing.five,
    paddingHorizontal: Spacing.five,
  },
  retryButtonText: { fontSize: 13, fontWeight: "700" },
});
