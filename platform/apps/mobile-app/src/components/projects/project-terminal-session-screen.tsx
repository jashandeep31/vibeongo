import {
  EMPTY_TERMINAL_WORKSPACE,
  useSessionChatsStore,
  useTerminalWorkspaceStore,
} from "@repo/app-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  type KeyboardEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PageChromeLayout } from "@/components/page-chrome";
import { ProjectTerminalSwitcherDrawer } from "@/components/projects/project-terminal-switcher-drawer";
import { ProjectWorkspaceTopBar } from "@/components/projects/project-workspace-top-bar";
import ProjectTerminalDom, {
  type ProjectTerminalDomRef,
} from "@/components/projects/project-terminal.dom";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";
import { useVibeongoTermV2 } from "@/hooks/use-vibeongo-term-v2";
import { useInstanceExpiryWarning } from "@/components/projects/instance-expiry-countdown";

const TERMINAL_DOM_PROPS: import("expo/dom").DOMProps = {
  bounces: false,
  contentInsetAdjustmentBehavior: "never",
  keyboardDisplayRequiresUserAction: false,
  overScrollMode: "never",
  scrollEnabled: false,
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getLocalToken(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  const value = (config as Record<string, unknown>).vibeongoLocalToken;
  return typeof value === "string" ? value : "";
}

function getControlCharacter(data: string) {
  if (data.length !== 1) return null;
  if (data === " ") return "\u0000";
  if (data === "?") return "\u007f";

  const code = data.toUpperCase().charCodeAt(0);
  return code >= 64 && code <= 95 ? String.fromCharCode(code - 64) : null;
}

function setTerminalInputEnabled(
  terminal: ProjectTerminalDomRef | null,
  enabled: boolean,
) {
  if (typeof terminal?.setInputEnabled === "function") {
    terminal.setInputEnabled(enabled);
  }
}

export function ProjectTerminalSessionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{
    chatId?: string | string[];
    projectId?: string | string[];
    projectSessionId?: string | string[];
    terminalId?: string | string[];
  }>();
  const projectId = firstParam(params.projectId);
  const projectSessionId = firstParam(params.projectSessionId);
  const terminalId = firstParam(params.terminalId);
  const chatId = firstParam(params.chatId);
  const latestChatId = useSessionChatsStore(
    (store) => store.chatsBySessionId[projectSessionId]?.[0]?.id ?? "",
  );
  const reviewChatId = chatId || latestChatId;
  const terminalWorkspace = useTerminalWorkspaceStore(
    (store) => store.workspaces[projectSessionId] ?? EMPTY_TERMINAL_WORKSPACE,
  );
  const terminalSessionIndex = terminalWorkspace.terminalSessions.findIndex(
    (session) => session.id === terminalId,
  );
  const terminalSession =
    terminalWorkspace.terminalSessions[terminalSessionIndex];
  const runtime = useProjectRuntime(projectSessionId);
  const isInstanceExpiring = useInstanceExpiryWarning(
    runtime.instance?.terminates_at,
  );
  const runtimeUrl = runtime.instance
    ? `https://3101-${runtime.instance.id}${runtime.instance.proxy_domain}`
    : "";
  const localToken = getLocalToken(runtime.instance?.config);
  const terminalRef = useRef<ProjectTerminalDomRef>(null);
  const terminalAreaRef = useRef<View>(null);
  const terminalSizeRef = useRef({ cols: 80, rows: 24 });
  const keyboardTopRef = useRef<number | null>(null);
  const controlActiveRef = useRef(false);
  const awaitingBufferReplayRef = useRef(false);
  const [controlActive, setControlActive] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const composerFocusedRef = useRef(false);
  const sendingDraftRef = useRef(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [terminalReady, setTerminalReady] = useState(false);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
  const terminal = useVibeongoTermV2({
    accessToken: runtime.accessToken,
    enabled: Boolean(
      terminalReady &&
      terminalId &&
      runtime.instance &&
      localToken &&
      runtime.accessToken,
    ),
    localToken,
    runtimeUrl,
    sessionId: terminalId,
  });
  const draft = drafts[terminalId] ?? "";

  useEffect(() => {
    sendingDraftRef.current = false;
    setSelectedText("");
  }, [terminalId]);

  const goBack = () => {
    router.dismissTo({
      pathname: "/projects/[projectId]/sessions/[projectSessionId]/terminal",
      params: { chatId, projectId, projectSessionId },
    });
  };

  const selectTerminal = (nextTerminalId: string) => {
    setSwitcherVisible(false);
    if (nextTerminalId === terminalId) {
      terminalRef.current?.focus();
      return;
    }
    router.replace({
      pathname:
        "/projects/[projectId]/sessions/[projectSessionId]/terminal/[terminalId]",
      params: {
        chatId,
        projectId,
        projectSessionId,
        terminalId: nextTerminalId,
      },
    });
  };

  useEffect(
    () =>
      terminal.subscribe((event) => {
        if (event.type === "session") {
          awaitingBufferReplayRef.current = event.hasBuffer;
          terminalRef.current?.reset();
        } else if (awaitingBufferReplayRef.current) {
          awaitingBufferReplayRef.current = false;
          terminalRef.current?.replace(event.data);
        } else {
          terminalRef.current?.write(event.data);
        }
      }),
    [terminal.subscribe],
  );

  useEffect(() => {
    const connected = terminal.status === "connected";
    setTerminalInputEnabled(terminalRef.current, connected);
    if (!connected) {
      controlActiveRef.current = false;
      setControlActive(false);
    } else {
      terminal.sendResize(
        terminalSizeRef.current.cols,
        terminalSizeRef.current.rows,
      );
      if (!selectionMode && !panMode && !composerFocusedRef.current) {
        terminalRef.current?.focus();
      }
    }
  }, [panMode, selectionMode, terminal.sendResize, terminal.status]);

  const updateKeyboardOverlap = useCallback(() => {
    const keyboardTop = keyboardTopRef.current;
    if (keyboardTop === null) {
      setKeyboardOverlap(0);
      return;
    }

    terminalAreaRef.current?.measureInWindow((_x, y, _width, height) => {
      const nextOverlap = Math.max(0, Math.round(y + height - keyboardTop));
      setKeyboardOverlap((current) =>
        current === nextOverlap ? current : nextOverlap,
      );
    });
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(
      showEvent,
      (event: KeyboardEvent) => {
        keyboardTopRef.current = event.endCoordinates.screenY;
        if (Platform.OS === "ios") Keyboard.scheduleLayoutAnimation(event);
        updateKeyboardOverlap();
      },
    );
    const hideSubscription = Keyboard.addListener(
      hideEvent,
      (event: KeyboardEvent) => {
        keyboardTopRef.current = null;
        if (Platform.OS === "ios") Keyboard.scheduleLayoutAnimation(event);
        setKeyboardOverlap(0);
      },
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [updateKeyboardOverlap]);

  const sendInput = useCallback(
    async (data: string) => {
      let terminalData = data;
      if (controlActiveRef.current) {
        const controlCharacter = getControlCharacter(data);
        if (controlCharacter !== null) terminalData = controlCharacter;
      }
      if (terminal.sendInput(terminalData) && controlActiveRef.current) {
        controlActiveRef.current = false;
        setControlActive(false);
      }
    },
    [terminal.sendInput],
  );

  const sendKey = (data: string) => {
    if (terminal.sendInput(data) && controlActiveRef.current) {
      controlActiveRef.current = false;
      setControlActive(false);
    }
    terminalRef.current?.focus();
  };

  const submitDraft = () => {
    if (
      sendingDraftRef.current ||
      terminal.status !== "connected" ||
      !draft.trim()
    ) return;
    sendingDraftRef.current = true;
    const sent = terminal.sendInput(`${draft}\r`);
    if (sent) {
      setDrafts((current) => ({ ...current, [terminalId]: "" }));
    } else {
      Alert.alert("Could not send to terminal", "Check the connection and try again.");
      sendingDraftRef.current = false;
    }
  };

  const updateSelectionMode = (enabled: boolean) => {
    if (enabled && panMode) {
      terminalRef.current?.setPanMode(false);
      setPanMode(false);
    }
    terminalRef.current?.setSelectionMode(enabled);
    setSelectionMode(enabled);
    if (enabled) Keyboard.dismiss();
    else setSelectedText("");
  };

  const copySelection = async () => {
    if (!selectedText) return;
    try {
      await Clipboard.setStringAsync(selectedText);
      updateSelectionMode(false);
    } catch {
      Alert.alert("Could not copy text", "Please try again.");
    }
  };

  const handleSelectionChange = useCallback(async (selection: string) => {
    setSelectedText(selection);
  }, []);

  const sendSize = useCallback(
    async (rows: number, cols: number) => {
      terminalSizeRef.current = { cols, rows };
      terminal.sendResize(cols, rows);
    },
    [terminal.sendResize],
  );

  const markTerminalReady = useCallback(async () => {
    setTerminalInputEnabled(terminalRef.current, false);
    setTerminalReady(true);
  }, []);

  const updatePanMode = (enabled: boolean) => {
    if (enabled && selectionMode) updateSelectionMode(false);
    const terminalDom = terminalRef.current;
    if (typeof terminalDom?.setPanMode !== "function") return;
    terminalDom.setPanMode(enabled);
    setPanMode(enabled);
    if (enabled) {
      controlActiveRef.current = false;
      setControlActive(false);
    } else {
      terminalDom.focus();
    }
  };

  if (runtime.isPending) {
    return (
      <TerminalStateScreen
        loading
        message="Loading terminal…"
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
        message="Resume this project session to open the terminal."
        onBack={goBack}
      />
    );
  }

  if (!terminalId || !localToken || !runtime.accessToken) {
    return (
      <TerminalStateScreen
        message="Terminal credentials or terminal ID are unavailable."
        onBack={goBack}
      />
    );
  }

  const statusColor =
    terminal.status === "connected"
      ? "#10b981"
      : terminal.status === "connecting"
        ? "#f59e0b"
        : "#ef4444";
  const terminalLabel = terminalSession
    ? terminalSession.name
    : terminalId.length > 12
      ? `${terminalId.slice(0, 8)}…`
      : terminalId;
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <PageChromeLayout
        top={
          <ProjectWorkspaceTopBar
            instanceId={runtime.instance.id}
            isExpiring={isInstanceExpiring}
            onBack={goBack}
            onOpenSwitcher={() => {
              Keyboard.dismiss();
              setSwitcherVisible(true);
            }}
            opencodePassword={runtime.password}
            projectId={projectId}
            projectSessionId={projectSessionId}
            showMcp={false}
            opencodeSessionId={reviewChatId}
            switcherAccessibilityLabel="Switch terminal"
            terminatesAt={runtime.instance.terminates_at}
            title={terminalLabel}
            titleTrailing={
              <>
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor }]}
                />
                <ThemedText style={styles.latency} themeColor="textSecondary">
                  {terminal.latencyMs === null ? "--" : terminal.latencyMs} ms
                </ThemedText>
              </>
            }
          />
        }
      >
        {({ topInset }) => (
          <View
            onLayout={updateKeyboardOverlap}
            ref={terminalAreaRef}
            style={[
              styles.terminalArea,
              { backgroundColor: theme.background, paddingTop: topInset },
            ]}
          >
            <View
              style={[
                styles.terminalFrame,
                { backgroundColor: theme.background },
              ]}
            >
              <ProjectTerminalDom
                dom={TERMINAL_DOM_PROPS}
                onInput={sendInput}
                onReady={markTerminalReady}
                onResize={sendSize}
                onSelectionChange={handleSelectionChange}
                ref={terminalRef}
                terminalTheme={{
                  background: theme.background,
                  cursor: theme.text,
                  foreground: theme.text,
                  selectionBackground: theme.backgroundSelected,
                }}
              />
            </View>
            <ScrollView
              contentContainerStyle={styles.keys}
              horizontal
              keyboardShouldPersistTaps="always"
              showsHorizontalScrollIndicator={false}
              style={[styles.keyBar, { backgroundColor: theme.background }]}
            >
              <Pressable
                accessibilityLabel={
                  selectionMode ? "Cancel terminal selection" : "Select terminal text"
                }
                accessibilityRole="button"
                accessibilityState={{ selected: selectionMode }}
                onPress={() => updateSelectionMode(!selectionMode)}
                style={({ pressed }) => [
                  styles.key,
                  {
                    backgroundColor: selectionMode
                      ? theme.backgroundSelected
                      : theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: "text.cursor", android: "text_fields" }}
                  size={15}
                  tintColor={theme.textSecondary}
                />
                <ThemedText style={styles.keyLabel}>
                  {selectionMode ? "Cancel" : "Select"}
                </ThemedText>
              </Pressable>
              {selectionMode ? (
                <Pressable
                  accessibilityLabel="Copy selected terminal text"
                  accessibilityRole="button"
                  disabled={!selectedText}
                  onPress={() => void copySelection()}
                  style={({ pressed }) => [
                    styles.key,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                    },
                    !selectedText && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={{ ios: "doc.on.doc", android: "content_copy" }}
                    size={15}
                    tintColor={theme.textSecondary}
                  />
                  <ThemedText style={styles.keyLabel}>Copy</ThemedText>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityLabel={
                  panMode
                    ? "Disable terminal pan mode"
                    : "Enable terminal pan mode"
                }
                accessibilityRole="button"
                accessibilityState={{ selected: panMode }}
                onPress={() => updatePanMode(!panMode)}
                style={({ pressed }) => [
                  styles.iconPill,
                  {
                    backgroundColor: panMode
                      ? theme.backgroundSelected
                      : theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: "hand.draw", android: "pan_tool" }}
                  size={18}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
              <Pressable
                accessibilityLabel={
                  controlActive
                    ? "Disable Control modifier"
                    : "Enable Control modifier"
                }
                accessibilityRole="button"
                accessibilityState={{ selected: controlActive }}
                disabled={terminal.status !== "connected" || panMode}
                onPress={() => {
                  const active = !controlActiveRef.current;
                  controlActiveRef.current = active;
                  setControlActive(active);
                  terminalRef.current?.focus();
                }}
                style={({ pressed }) => [
                  styles.key,
                  {
                    backgroundColor: controlActive
                      ? theme.backgroundSelected
                      : theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                  (terminal.status !== "connected" || panMode) &&
                    styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.keyLabel}>Ctrl</ThemedText>
              </Pressable>
              {[
                ["Esc", "\u001b"],
                ["Tab", "\t"],
                ["↑", "\u001b[A"],
                ["↓", "\u001b[B"],
                ["←", "\u001b[D"],
                ["→", "\u001b[C"],
              ].map(([keyLabel, data]) => (
                <Pressable
                  accessibilityLabel={`Send ${keyLabel}`}
                  accessibilityRole="button"
                  disabled={terminal.status !== "connected" || panMode}
                  key={keyLabel}
                  onPress={() => sendKey(data)}
                  style={({ pressed }) => [
                    styles.key,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                    },
                    (terminal.status !== "connected" || panMode) &&
                      styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.keyLabel}>{keyLabel}</ThemedText>
                </Pressable>
              ))}
              {[
                ["A−", "Zoom out", "zoomOut"],
                ["A+", "Zoom in", "zoomIn"],
              ].map(([keyLabel, accessibilityLabel, action]) => (
                <Pressable
                  accessibilityLabel={accessibilityLabel}
                  accessibilityRole="button"
                  key={action}
                  onPress={() => {
                    const terminalDom = terminalRef.current;
                    if (
                      action === "zoomIn" &&
                      typeof terminalDom?.zoomIn === "function"
                    ) {
                      terminalDom.zoomIn();
                    } else if (
                      action === "zoomOut" &&
                      typeof terminalDom?.zoomOut === "function"
                    ) {
                      terminalDom.zoomOut();
                    }
                    terminalDom?.focus();
                  }}
                  style={({ pressed }) => [
                    styles.key,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.keyLabel}>{keyLabel}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <View
              style={[
                styles.composerArea,
                { backgroundColor: theme.background },
              ]}
            >
              <View
                style={[
                  styles.composer,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
              >
                <TextInput
                  accessibilityLabel="Text to send to terminal"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={terminal.status === "connected"}
                  onBlur={() => {
                    composerFocusedRef.current = false;
                  }}
                  onChangeText={(value) => {
                    sendingDraftRef.current = false;
                    setDrafts((current) => ({
                      ...current,
                      [terminalId]: value.replace(/[\r\n]+/g, " "),
                    }));
                  }}
                  onFocus={() => {
                    composerFocusedRef.current = true;
                  }}
                  onSubmitEditing={submitDraft}
                  placeholder="Send to terminal"
                  placeholderTextColor={theme.textSecondary}
                  returnKeyType="send"
                  style={[styles.composerInput, { color: theme.text }]}
                  value={draft}
                />
                <Pressable
                  accessibilityLabel="Send to terminal"
                  accessibilityRole="button"
                  disabled={terminal.status !== "connected" || !draft.trim()}
                  onPress={submitDraft}
                  style={({ pressed }) => [
                    styles.composerSend,
                    { backgroundColor: theme.text },
                    (terminal.status !== "connected" || !draft.trim()) &&
                      styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={{ ios: "arrow.up", android: "arrow_upward" }}
                    size={17}
                    tintColor={theme.background}
                  />
                </Pressable>
              </View>
            </View>
            {keyboardOverlap > 0 ? (
              <View pointerEvents="none" style={{ height: keyboardOverlap }} />
            ) : null}
          </View>
        )}
      </PageChromeLayout>
      <ProjectTerminalSwitcherDrawer
        accessToken={runtime.accessToken}
        currentTerminalId={terminalId}
        localToken={localToken}
        onClose={() => setSwitcherVisible(false)}
        onSelect={selectTerminal}
        projectSessionId={projectSessionId}
        runtimeUrl={runtimeUrl}
        visible={switcherVisible}
      />
    </SafeAreaView>
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
  composer: {
    alignItems: "flex-end",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    minWidth: 0,
    padding: 6,
  },
  composerArea: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  composerInput: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 15,
    lineHeight: 21,
    minHeight: 36,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  composerSend: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  disabled: { opacity: 0.5 },
  key: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  iconPill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  keyBar: { flexGrow: 0 },
  keyLabel: { fontSize: 12, fontWeight: "700" },
  keys: { gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  latency: { fontFamily: Fonts.mono, fontSize: 10 },
  pressed: { opacity: 0.68 },
  screen: { flex: 1 },
  state: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 28,
  },
  stateBack: { padding: 18 },
  stateText: { textAlign: "center" },
  statusDot: { borderRadius: 4, height: 8, width: 8 },
  terminalArea: { flex: 1 },
  terminalFrame: { flex: 1 },
});
