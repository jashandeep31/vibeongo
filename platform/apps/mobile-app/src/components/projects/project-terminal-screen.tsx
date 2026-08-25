import {
  EMPTY_TERMINAL_WORKSPACE,
  useProjectsStore,
  useSessionsStore,
  useTerminalWorkspaceStore,
} from "@repo/app-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { PageChromeLayout, PageHeader } from "@/components/page-chrome";
import { Fonts } from "@/constants/theme";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";
import {
  createVibeongoTerminalSession,
  type TmuxSession,
} from "@/hooks/use-vibeongo-ws-v2";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getLocalToken(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  const value = (config as Record<string, unknown>).vibeongoLocalToken;
  return typeof value === "string" ? value : "";
}

export function ProjectTerminalScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const terminalCardSize = Math.floor((Math.min(windowWidth, 560) - 48) / 2);
  const params = useLocalSearchParams<{
    projectId?: string | string[];
    projectSessionId?: string | string[];
  }>();
  const projectId = firstParam(params.projectId);
  const projectSessionId = firstParam(params.projectSessionId);
  const [isCreatingTerminal, setIsCreatingTerminal] = useState(false);
  const projectName = useProjectsStore(
    (store) =>
      store.projects.find((project) => project.id === projectId)?.name ??
      "Project",
  );
  const sessionName = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === projectSessionId)
        ?.session.name ?? "Session",
  );
  const runtime = useProjectRuntime(projectSessionId);
  const runtimeUrl = runtime.instance
    ? `https://3101-${runtime.instance.id}${runtime.instance.proxy_domain}`
    : "";
  const localToken = getLocalToken(runtime.instance?.config);
  const terminalWorkspace = useTerminalWorkspaceStore(
    (store) => store.workspaces[projectSessionId] ?? EMPTY_TERMINAL_WORKSPACE,
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const openTerminal = (terminalId: string) => {
    router.push({
      pathname:
        "/projects/[projectId]/sessions/[projectSessionId]/terminal/[terminalId]",
      params: { projectId, projectSessionId, terminalId },
    });
  };

  const addTerminalSession = async () => {
    if (isCreatingTerminal) return;
    setIsCreatingTerminal(true);
    try {
      const sessionId = await createVibeongoTerminalSession({
        accessToken: runtime.accessToken,
        localToken,
        runtimeUrl,
      });
      if (sessionId) openTerminal(sessionId);
    } catch (error) {
      Alert.alert(
        "Could not create terminal",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsCreatingTerminal(false);
    }
  };

  if (runtime.isPending) {
    return (
      <TerminalStateScreen
        loading
        message="Loading terminal sessions…"
        onBack={goBack}
      />
    );
  }

  if (runtime.isError) {
    return (
      <TerminalStateScreen
        message="Could not load this runtime. Check your connection and try again."
        onBack={goBack}
      />
    );
  }

  if (!runtime.instance) {
    return (
      <TerminalStateScreen
        message="Resume this project session to view its terminals."
        onBack={goBack}
      />
    );
  }

  if (!localToken || !runtime.accessToken) {
    return (
      <TerminalStateScreen
        message="Terminal credentials are unavailable for this runtime."
        onBack={goBack}
      />
    );
  }

  const statusColor =
    terminalWorkspace.status === "connected"
      ? "#10b981"
      : terminalWorkspace.status === "connecting"
        ? "#f59e0b"
        : "#ef4444";

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <PageChromeLayout
        top={
          <PageHeader
            onBack={goBack}
            title={`${projectName} · ${sessionName} · Terminal`}
            titleLeading={
              <SymbolView
                name={{ ios: "apple.terminal", android: "terminal" }}
                size={16}
                tintColor={theme.textSecondary}
              />
            }
            titleTrailing={
              <View
                accessibilityLabel={`WebSocket ${terminalWorkspace.status}`}
                accessibilityRole="text"
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
            }
          />
        }
      >
        {({ topInset }) => (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingTop: topInset }]}
            showsVerticalScrollIndicator={false}
          >
            <SectionHeading
              count={terminalWorkspace.terminalSessionIds.length}
              title="Terminal sessions"
            />

            <View style={styles.terminalGrid}>
              <Pressable
                accessibilityLabel="New terminal session"
                accessibilityRole="button"
                disabled={isCreatingTerminal}
                onPress={() => void addTerminalSession()}
                style={({ pressed }) => [
                  styles.newSessionCard,
                  { height: terminalCardSize, width: terminalCardSize },
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                  isCreatingTerminal && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.newSessionIcon,
                    { backgroundColor: theme.backgroundSelected },
                  ]}
                >
                  {isCreatingTerminal ? (
                    <ActivityIndicator color={theme.text} size="small" />
                  ) : (
                    <SymbolView
                      name={{ ios: "plus", android: "add" }}
                      size={20}
                      tintColor={theme.text}
                    />
                  )}
                </View>
                <View>
                  <ThemedText style={styles.cardTitle}>New session</ThemedText>
                  <ThemedText
                    style={styles.newSessionHint}
                    themeColor="textSecondary"
                  >
                    Open a fresh shell
                  </ThemedText>
                </View>
              </Pressable>

              {terminalWorkspace.terminalSessionIds.map((terminalId, index) => {
                const isActive =
                  terminalId === terminalWorkspace.activeTerminalSessionId;
                return (
                  <Pressable
                    accessibilityLabel={`Open Terminal ${index + 1}`}
                    accessibilityRole="button"
                    key={terminalId}
                    onPress={() => openTerminal(terminalId)}
                    style={({ pressed }) => [
                      styles.terminalCard,
                      { height: terminalCardSize, width: terminalCardSize },
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: isActive
                          ? "rgba(16, 185, 129, 0.55)"
                          : theme.backgroundSelected,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.terminalCardTop}>
                      <View
                        style={[
                          styles.iconTile,
                          { backgroundColor: theme.backgroundSelected },
                        ]}
                      >
                        <SymbolView
                          name={{ ios: "apple.terminal", android: "terminal" }}
                          size={17}
                          tintColor={theme.text}
                        />
                      </View>
                      {isActive ? (
                        <View style={styles.activeBadge}>
                          <View style={styles.activeDot} />
                          <ThemedText style={styles.activeLabel}>
                            Active
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.cardFooter}>
                      <View style={styles.cardCopy}>
                        <ThemedText style={styles.cardTitle}>
                          Terminal {index + 1}
                        </ThemedText>
                        <ThemedText
                          numberOfLines={1}
                          style={[
                            styles.identifier,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {terminalId}
                        </ThemedText>
                      </View>
                      <SymbolView
                        name={{
                          ios: "chevron.right",
                          android: "chevron_right",
                        }}
                        size={16}
                        tintColor={theme.textSecondary}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.tmuxSection}>
              <SectionHeading
                count={terminalWorkspace.tmuxSessions.length}
                title="Tmux sessions"
              />
              {terminalWorkspace.tmuxSessions.length > 0 ? (
                <View style={styles.tmuxList}>
                  {terminalWorkspace.tmuxSessions.map((session) => (
                    <TmuxSessionCard key={session.name} session={session} />
                  ))}
                </View>
              ) : (
                <EmptyState
                  message={
                    terminalWorkspace.status === "connected"
                      ? "No tmux sessions are running."
                      : "Waiting for tmux sessions…"
                  }
                />
              )}
            </View>
          </ScrollView>
        )}
      </PageChromeLayout>
    </SafeAreaView>
  );
}

function SectionHeading({ count, title }: { count: number; title: string }) {
  const theme = useTheme();

  return (
    <View style={styles.sectionHeading}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View
        style={[
          styles.countBadge,
          { backgroundColor: theme.backgroundElement },
        ]}
      >
        <ThemedText style={styles.countText} themeColor="textSecondary">
          {count}
        </ThemedText>
      </View>
    </View>
  );
}

function TmuxSessionCard({ session }: { session: TmuxSession }) {
  const theme = useTheme();

  return (
    <View style={[styles.tmuxCard, { borderColor: theme.backgroundSelected }]}>
      <View
        style={[
          styles.tmuxHeader,
          {
            backgroundColor: theme.backgroundElement,
            borderBottomColor: theme.backgroundSelected,
          },
        ]}
      >
        <SymbolView
          name={{ ios: "apple.terminal", android: "terminal" }}
          size={17}
          tintColor={theme.textSecondary}
        />
        <ThemedText style={styles.tmuxName}>{session.name}</ThemedText>
        <ThemedText style={styles.windowCount} themeColor="textSecondary">
          {session.windows.length}{" "}
          {session.windows.length === 1 ? "window" : "windows"}
        </ThemedText>
      </View>

      {session.windows.length > 0 ? (
        session.windows.map((window, index) => (
          <View
            key={`${session.name}-${window.name}`}
            style={[
              styles.windowRow,
              index > 0 && {
                borderTopColor: theme.backgroundSelected,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.windowNameRow}>
              <SymbolView
                name={{ ios: "chevron.right", android: "chevron_right" }}
                size={15}
                tintColor={theme.textSecondary}
              />
              <ThemedText numberOfLines={1} style={styles.windowName}>
                {window.name}
              </ThemedText>
            </View>
            <View style={styles.panes}>
              {window.panes.map((pane) => (
                <View
                  key={`${session.name}-${window.name}-${pane.name}`}
                  style={[
                    styles.paneBadge,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <ThemedText style={styles.paneText}>
                    Pane {pane.name}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        ))
      ) : (
        <ThemedText style={styles.noWindows} themeColor="textSecondary">
          No windows
        </ThemedText>
      )}
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <ThemedText style={styles.emptyText} themeColor="textSecondary">
        {message}
      </ThemedText>
    </View>
  );
}

function TerminalStateScreen({
  loading = false,
  message,
  onBack,
}: {
  loading?: boolean;
  message: string;
  onBack: () => void;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <Pressable onPress={onBack} style={styles.stateBack}>
        <SymbolView
          name={{ ios: "chevron.left", android: "arrow_back" }}
          size={20}
          tintColor={theme.text}
        />
      </Pressable>
      <View style={styles.state}>
        {loading ? <ActivityIndicator color={theme.textSecondary} /> : null}
        <ThemedText style={styles.stateText} themeColor="textSecondary">
          {message}
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activeBadge: {
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderRadius: 10,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  activeDot: {
    backgroundColor: "#10b981",
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  activeLabel: { color: "#10b981", fontSize: 10, fontWeight: "700" },
  cardCopy: { flex: 1, minWidth: 0 },
  cardFooter: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  content: {
    alignSelf: "center",
    maxWidth: 560,
    padding: 18,
    paddingBottom: 36,
    width: "100%",
  },
  countBadge: {
    borderRadius: 12,
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: { fontSize: 12, lineHeight: 16, textAlign: "center" },
  disabled: { opacity: 0.5 },
  emptyState: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
  },
  emptyText: { fontSize: 13, textAlign: "center" },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    height: 56,
    paddingHorizontal: 8,
  },
  headerButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  iconTile: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  identifier: { fontFamily: Fonts.mono, fontSize: 11, lineHeight: 16 },
  newSessionCard: {
    borderRadius: 14,
    borderStyle: "dashed",
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "space-between",
    padding: 15,
  },
  newSessionHint: { fontSize: 11, lineHeight: 16 },
  newSessionIcon: {
    alignItems: "center",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  noWindows: { fontSize: 13, padding: 16 },
  paneBadge: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  panes: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  paneText: { fontFamily: Fonts.mono, fontSize: 11, lineHeight: 15 },
  pressed: { opacity: 0.65 },
  screen: { flex: 1 },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    lineHeight: 18,
    textTransform: "uppercase",
  },
  state: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 28,
  },
  stateBack: { padding: 18 },
  stateText: { textAlign: "center" },
  statusDot: { borderRadius: 5, height: 9, marginRight: 8, width: 9 },
  terminalCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "space-between",
    padding: 15,
  },
  terminalCardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  terminalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  title: { flex: 1, fontSize: 14, fontWeight: "700" },
  tmuxCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  tmuxHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 9,
    padding: 13,
  },
  tmuxList: { gap: 12 },
  tmuxName: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: "700",
  },
  tmuxSection: { marginTop: 32 },
  windowCount: { fontSize: 11 },
  windowName: { flexShrink: 1, fontSize: 13, fontWeight: "600" },
  windowNameRow: { alignItems: "center", flexDirection: "row", gap: 5 },
  windowRow: { gap: 10, padding: 13 },
});
