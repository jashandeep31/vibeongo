import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProjectDomainsButton } from "@/components/projects/project-domains-drawer";
import { PageChromeLayout, PageHeader } from "@/components/page-chrome";
import { ProjectTerminalSwitcherDrawer } from "@/components/projects/project-terminal-switcher-drawer";
import ProjectTerminalDom, {
  type ProjectTerminalDomRef,
} from "@/components/projects/project-terminal.dom";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";
import { useVibeongoTermV2 } from "@/hooks/use-vibeongo-term-v2";

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
    projectId?: string | string[];
    projectSessionId?: string | string[];
    terminalId?: string | string[];
  }>();
  const projectId = firstParam(params.projectId);
  const projectSessionId = firstParam(params.projectSessionId);
  const terminalId = firstParam(params.terminalId);
  const runtime = useProjectRuntime(projectSessionId);
  const runtimeUrl = runtime.instance
    ? `https://3101-${runtime.instance.id}${runtime.instance.proxy_domain}`
    : "";
  const localToken = getLocalToken(runtime.instance?.config);
  const terminalRef = useRef<ProjectTerminalDomRef>(null);
  const terminalSizeRef = useRef({ cols: 80, rows: 24 });
  const controlActiveRef = useRef(false);
  const awaitingBufferReplayRef = useRef(false);
  const [controlActive, setControlActive] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [terminalReady, setTerminalReady] = useState(false);
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

  const goBack = () => {
    router.dismissTo({
      pathname: "/projects/[projectId]/sessions/[projectSessionId]/terminal",
      params: { projectId, projectSessionId },
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
      terminalRef.current?.focus();
    }
  }, [terminal.sendResize, terminal.status]);

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
  const terminalLabel =
    terminalId.length > 12 ? `${terminalId.slice(0, 8)}…` : terminalId;

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <PageChromeLayout
        top={
          <PageHeader
            accessibilityLabel={`Terminal ${terminalId}, ${terminal.status}`}
            onBack={goBack}
            onTitlePress={() => {
              Keyboard.dismiss();
              setSwitcherVisible(true);
            }}
            right={
              <View
                style={[
                  styles.headerActions,
                  { backgroundColor: theme.backgroundElement },
                ]}
              >
                <Pressable
                  accessibilityLabel="Monitor VPS"
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname:
                        "/projects/[projectId]/sessions/[projectSessionId]/settings",
                      params: { projectId, projectSessionId },
                    })
                  }
                  style={({ pressed }) => [
                    styles.headerAction,
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: "waveform.path.ecg",
                      android: "monitor_heart",
                    }}
                    size={19}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>
                <ProjectDomainsButton
                  instanceId={runtime.instance.id}
                  projectId={projectId}
                />
              </View>
            }
            title={terminalLabel}
            titleLeading={
              <>
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor }]}
                />
                <SymbolView
                  name={{ ios: "apple.terminal", android: "terminal" }}
                  size={15}
                  tintColor={theme.textSecondary}
                />
              </>
            }
            titleTextStyle={styles.headerTitle}
            titleTrailing={
              <>
                <ThemedText style={styles.latency} themeColor="textSecondary">
                  {terminal.latencyMs === null ? "--" : terminal.latencyMs} ms
                </ThemedText>
                <SymbolView
                  name={{
                    ios: "chevron.down",
                    android: "keyboard_arrow_down",
                  }}
                  size={14}
                  tintColor={theme.textSecondary}
                />
              </>
            }
            titleVariant="pill"
          />
        }
      >
        {({ topInset }) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.terminalArea, { paddingTop: topInset }]}
          >
            <View style={styles.terminalFrame}>
              <ProjectTerminalDom
                dom={TERMINAL_DOM_PROPS}
                onInput={sendInput}
                onReady={markTerminalReady}
                onResize={sendSize}
                ref={terminalRef}
              />
            </View>
            <ScrollView
              contentContainerStyle={styles.keys}
              horizontal
              keyboardShouldPersistTaps="always"
              showsHorizontalScrollIndicator={false}
              style={[
                styles.keyBar,
                {
                  backgroundColor: theme.background,
                  borderTopColor: theme.backgroundSelected,
                },
              ]}
            >
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
                  styles.key,
                  {
                    backgroundColor: panMode
                      ? theme.text
                      : theme.backgroundElement,
                    borderColor: panMode
                      ? theme.text
                      : theme.backgroundSelected,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: "hand.draw", android: "pan_tool" }}
                  size={17}
                  tintColor={panMode ? theme.background : theme.text}
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
                      ? theme.text
                      : theme.backgroundElement,
                    borderColor: controlActive
                      ? theme.text
                      : theme.backgroundSelected,
                  },
                  (terminal.status !== "connected" || panMode) &&
                    styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  style={[
                    styles.keyLabel,
                    controlActive && { color: theme.background },
                  ]}
                >
                  Ctrl
                </ThemedText>
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
          </KeyboardAvoidingView>
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
  disabled: { opacity: 0.5 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerAction: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  headerActions: {
    alignItems: "center",
    borderRadius: 24,
    flexDirection: "row",
    height: 44,
    overflow: "hidden",
  },
  headerButton: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerTitle: {
    flexShrink: 1,
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: "700",
  },
  headerTitleWrap: {
    alignItems: "center",
    borderRadius: 18,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    height: 40,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 10,
  },
  key: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    minWidth: 48,
    paddingHorizontal: 12,
  },
  keyBar: { borderTopWidth: StyleSheet.hairlineWidth, flexGrow: 0 },
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
  terminalArea: { backgroundColor: "#000000", flex: 1 },
  terminalFrame: { backgroundColor: "#000000", flex: 1 },
});
