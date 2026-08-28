import {
  EMPTY_TERMINAL_WORKSPACE,
  type TerminalSessionSummary,
  useProjectsStore,
  useSessionsStore,
  useTerminalWorkspaceStore,
} from "@repo/app-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { ConfirmationDrawer } from "@/components/confirmation-drawer";
import {
  PageChromeLayout,
  PageHeader,
  usePageTitleScrollFade,
} from "@/components/page-chrome";
import { ProjectTerminalDirectoryDrawer } from "@/components/projects/project-terminal-directory-drawer";
import ProjectTerminalDom, {
  type ProjectTerminalDomRef,
} from "@/components/projects/project-terminal.dom";
import { Fonts } from "@/constants/theme";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";
import {
  attachVibeongoTmuxTerminalSession,
  createVibeongoTerminalSession,
  killVibeongoTerminalSession,
  type TmuxSession,
} from "@/hooks/use-vibeongo-ws-v2";

const TERMINAL_PREVIEW_DOM_PROPS: import("expo/dom").DOMProps = {
  bounces: false,
  contentInsetAdjustmentBehavior: "never",
  overScrollMode: "never",
  scrollEnabled: false,
};

const TERMINAL_PREVIEW_BRIDGE_DELAY_MS = 250;
const ignoreTerminalEvent = () => Promise.resolve();

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getLocalToken(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  const value = (config as Record<string, unknown>).vibeongoLocalToken;
  return typeof value === "string" ? value : "";
}

function getTerminalLabel(session: TerminalSessionSummary) {
  return session.name;
}

export function ProjectTerminalScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { onTitleScroll, titleOpacity } = usePageTitleScrollFade();
  const { width: windowWidth } = useWindowDimensions();
  const terminalCardSize = Math.floor((Math.min(windowWidth, 560) - 48) / 2);
  const params = useLocalSearchParams<{
    projectId?: string | string[];
    projectSessionId?: string | string[];
  }>();
  const projectId = firstParam(params.projectId);
  const projectSessionId = firstParam(params.projectSessionId);
  const [isCreatingTerminal, setIsCreatingTerminal] = useState(false);
  const [attachingTmuxTarget, setAttachingTmuxTarget] = useState("");
  const [directoryDrawerVisible, setDirectoryDrawerVisible] = useState(false);
  const [killingTerminalId, setKillingTerminalId] = useState("");
  const [terminalPendingKill, setTerminalPendingKill] = useState<{
    id: string;
    label: string;
  } | null>(null);
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

  const addTerminalSession = async (workingDirectory?: string) => {
    if (isCreatingTerminal || attachingTmuxTarget) return;
    setDirectoryDrawerVisible(false);
    setIsCreatingTerminal(true);
    try {
      const sessionId = await createVibeongoTerminalSession({
        accessToken: runtime.accessToken,
        localToken,
        runtimeUrl,
        workingDirectory,
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

  const attachTmuxTerminal = async (
    tmuxSessionName: string,
    tmuxWindowId?: string,
  ) => {
    if (isCreatingTerminal || attachingTmuxTarget) return;
    const target = tmuxWindowId
      ? `${tmuxSessionName}:${tmuxWindowId}`
      : tmuxSessionName;
    setAttachingTmuxTarget(target);
    try {
      const terminalId = await attachVibeongoTmuxTerminalSession({
        accessToken: runtime.accessToken,
        localToken,
        runtimeUrl,
        tmuxSessionName,
        tmuxWindowId,
      });
      openTerminal(terminalId);
    } catch (error) {
      Alert.alert(
        "Could not attach to tmux",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setAttachingTmuxTarget("");
    }
  };

  const killTerminalSession = async (terminalId: string) => {
    if (killingTerminalId) return;
    setKillingTerminalId(terminalId);
    try {
      await killVibeongoTerminalSession({
        accessToken: runtime.accessToken,
        localToken,
        runtimeUrl,
        terminalId,
      });
    } catch (error) {
      Alert.alert(
        "Could not kill terminal",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setTerminalPendingKill(null);
      setKillingTerminalId("");
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
  const pendingTerminalSession = terminalWorkspace.terminalSessions.find(
    (session) => session.id === terminalPendingKill?.id,
  );

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
            titleOpacity={titleOpacity}
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
            onScroll={onTitleScroll}
            scrollEventThrottle={16}
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
                disabled={Boolean(isCreatingTerminal || attachingTmuxTarget)}
                onPress={() => setDirectoryDrawerVisible(true)}
                style={({ pressed }) => [
                  styles.newSessionCard,
                  { height: terminalCardSize, width: terminalCardSize },
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                  Boolean(isCreatingTerminal || attachingTmuxTarget) &&
                    styles.disabled,
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

              {terminalWorkspace.terminalSessions.map((terminalSession) => (
                <TerminalSessionCard
                  cardSize={terminalCardSize}
                  isKilling={killingTerminalId === terminalSession.id}
                  key={terminalSession.id}
                  onDelete={() =>
                    setTerminalPendingKill({
                      id: terminalSession.id,
                      label: getTerminalLabel(terminalSession),
                    })
                  }
                  onOpen={() => openTerminal(terminalSession.id)}
                  session={terminalSession}
                />
              ))}
            </View>

            <View style={styles.tmuxSection}>
              <SectionHeading
                count={terminalWorkspace.tmuxSessions.length}
                title="Tmux sessions"
              />
              {terminalWorkspace.tmuxSessions.length > 0 ? (
                <View style={styles.tmuxList}>
                  {terminalWorkspace.tmuxSessions.map((session) => (
                    <TmuxSessionCard
                      attachingTarget={attachingTmuxTarget}
                      disabled={Boolean(
                        isCreatingTerminal || attachingTmuxTarget,
                      )}
                      key={session.name}
                      onAttach={(windowId) =>
                        void attachTmuxTerminal(session.name, windowId)
                      }
                      session={session}
                    />
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
      <ProjectTerminalDirectoryDrawer
        dirs={terminalWorkspace.favoriteDirs}
        disabled={Boolean(isCreatingTerminal || attachingTmuxTarget)}
        onClose={() => setDirectoryDrawerVisible(false)}
        onSelect={(workingDirectory) =>
          void addTerminalSession(workingDirectory)
        }
        visible={directoryDrawerVisible}
      />
      <ConfirmationDrawer
        confirmLabel={
          pendingTerminalSession?.kind === "tmux"
            ? "Detach terminal"
            : "Kill terminal"
        }
        description={
          pendingTerminalSession?.kind === "tmux"
            ? "The web terminal will detach. The tmux session and its commands will keep running."
            : "The shell and any running command in this terminal will be stopped."
        }
        destructive
        isConfirming={Boolean(killingTerminalId)}
        onCancel={() => {
          if (!killingTerminalId) setTerminalPendingKill(null);
        }}
        onConfirm={() => {
          if (terminalPendingKill) {
            void killTerminalSession(terminalPendingKill.id);
          }
        }}
        title={`${pendingTerminalSession?.kind === "tmux" ? "Detach" : "Kill"} ${terminalPendingKill?.label ?? "terminal"}?`}
        visible={terminalPendingKill !== null}
      />
    </SafeAreaView>
  );
}

function TerminalSessionCard({
  cardSize,
  isKilling,
  onDelete,
  onOpen,
  session,
}: {
  cardSize: number;
  isKilling: boolean;
  onDelete: () => void;
  onOpen: () => void;
  session: TerminalSessionSummary;
}) {
  const terminalRef = useRef<ProjectTerminalDomRef>(null);
  const [terminalReady, setTerminalReady] = useState(false);

  useEffect(() => {
    if (!terminalReady) return;
    const bridgeReadyTimer = setTimeout(() => {
      terminalRef.current?.replace(session.buffer ?? "");
    }, TERMINAL_PREVIEW_BRIDGE_DELAY_MS);
    return () => clearTimeout(bridgeReadyTimer);
  }, [session.buffer, terminalReady]);

  const markTerminalReady = useCallback(async () => {
    setTerminalReady(true);
  }, []);
  const terminalAction = session.kind === "tmux" ? "Detach" : "Kill";

  return (
    <Pressable
      accessibilityLabel={`Open ${session.name}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [
        styles.terminalCard,
        { height: cardSize, width: cardSize },
        pressed && styles.pressed,
      ]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.terminalPreview}
      >
        <ProjectTerminalDom
          dom={TERMINAL_PREVIEW_DOM_PROPS}
          onInput={ignoreTerminalEvent}
          onReady={markTerminalReady}
          onResize={ignoreTerminalEvent}
          preview
          ref={terminalRef}
          terminalTheme={{
            background: "#000000",
            cursor: "#f8f8f2",
            foreground: "#f8f8f2",
            selectionBackground: "#47556999",
          }}
        />
      </View>
      <View pointerEvents="none" style={styles.terminalCardShade} />
      <Pressable
        accessibilityLabel={`${terminalAction} ${session.name}`}
        accessibilityRole="button"
        disabled={isKilling}
        hitSlop={8}
        onPress={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        style={({ pressed }) => [
          styles.terminalCardDelete,
          pressed && styles.pressed,
        ]}
      >
        {isKilling ? (
          <ActivityIndicator color="#f87171" size="small" />
        ) : (
          <SymbolView
            name={{ ios: "trash", android: "delete" }}
            size={13}
            tintColor="#f87171"
          />
        )}
      </Pressable>
      <View pointerEvents="none" style={styles.terminalCardNameLayer}>
        <ThemedText numberOfLines={1} style={styles.terminalCardName}>
          {session.name}
        </ThemedText>
      </View>
    </Pressable>
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

function TmuxSessionCard({
  attachingTarget,
  disabled,
  onAttach,
  session,
}: {
  attachingTarget: string;
  disabled: boolean;
  onAttach: (windowId?: string) => void;
  session: TmuxSession;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.tmuxCard, { borderColor: theme.backgroundSelected }]}>
      <Pressable
        accessibilityLabel={`Attach to tmux session ${session.name}`}
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => onAttach()}
        style={[
          styles.tmuxHeader,
          {
            backgroundColor: theme.backgroundElement,
            borderBottomColor: theme.backgroundSelected,
          },
          disabled && styles.disabled,
        ]}
      >
        {attachingTarget === session.name ? (
          <ActivityIndicator color={theme.textSecondary} size="small" />
        ) : (
          <SymbolView
            name={{ ios: "apple.terminal", android: "terminal" }}
            size={17}
            tintColor={theme.textSecondary}
          />
        )}
        <ThemedText style={styles.tmuxName}>{session.name}</ThemedText>
        <ThemedText style={styles.windowCount} themeColor="textSecondary">
          {session.windows.length}{" "}
          {session.windows.length === 1 ? "window" : "windows"}
        </ThemedText>
      </Pressable>

      {session.windows.length > 0 ? (
        session.windows.map((window, index) => (
          <Pressable
            accessibilityLabel={`Attach to ${session.name} window ${window.name}`}
            accessibilityRole="button"
            disabled={disabled}
            key={`${session.name}-${window.id}`}
            onPress={() => onAttach(window.id)}
            style={[
              styles.windowRow,
              index > 0 && {
                borderTopColor: theme.backgroundSelected,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
              disabled && styles.disabled,
            ]}
          >
            <View style={styles.windowNameRow}>
              {attachingTarget === `${session.name}:${window.id}` ? (
                <ActivityIndicator color={theme.textSecondary} size="small" />
              ) : (
                <SymbolView
                  name={{ ios: "chevron.right", android: "chevron_right" }}
                  size={15}
                  tintColor={theme.textSecondary}
                />
              )}
              <ThemedText numberOfLines={1} style={styles.windowName}>
                {window.name}
              </ThemedText>
            </View>
          </Pressable>
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
    backgroundColor: "#000000",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  terminalCardDelete: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 7,
    height: 27,
    justifyContent: "center",
    position: "absolute",
    right: 7,
    top: 7,
    width: 27,
  },
  terminalCardName: {
    color: "#f3f4f6",
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  terminalCardNameLayer: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    position: "absolute",
    right: 0,
  },
  terminalCardShade: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  terminalPreview: {
    backgroundColor: "#000000",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
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
