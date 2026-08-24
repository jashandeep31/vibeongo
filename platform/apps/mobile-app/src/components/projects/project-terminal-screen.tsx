import { useProjectsStore } from "@repo/app-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ProjectTerminalDom, {
  type ProjectTerminalDomRef,
} from "@/components/projects/project-terminal.dom";
import { ThemedText } from "@/components/themed-text";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";
import { useVibeongoRuntimeSocket } from "@/hooks/use-vibeongo-runtime-socket";

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

export function ProjectTerminalScreen() {
  const router = useRouter();
  const theme = useTheme();
  const terminalRef = useRef<ProjectTerminalDomRef>(null);
  const awaitingBufferReplayRef = useRef(false);
  const controlActiveRef = useRef(false);
  const terminalSizeRef = useRef({ cols: 80, rows: 24 });
  const [controlActive, setControlActive] = useState(false);
  const [terminalReady, setTerminalReady] = useState(false);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const params = useLocalSearchParams<{
    projectId?: string | string[];
    projectSessionId?: string | string[];
  }>();
  const projectId = firstParam(params.projectId);
  const projectSessionId = firstParam(params.projectSessionId);
  const projectName = useProjectsStore(
    (store) =>
      store.projects.find((project) => project.id === projectId)?.name ??
      "Project",
  );
  const runtime = useProjectRuntime(projectSessionId);
  const runtimeUrl = runtime.instance
    ? `https://3101-${runtime.instance.id}${runtime.instance.proxy_domain}`
    : "";
  const localToken = getLocalToken(runtime.instance?.config);
  const runtimeSocket = useVibeongoRuntimeSocket({
    accessToken: runtime.accessToken,
    enabled: terminalReady && Boolean(runtime.instance),
    localToken,
    runtimeUrl,
  });

  useEffect(
    () =>
      runtimeSocket.subscribeJsonMessage((message) => {
        if (message.type === "terminal" && typeof message.data === "string") {
          if (awaitingBufferReplayRef.current) {
            awaitingBufferReplayRef.current = false;
            terminalRef.current?.replace(message.data);
          } else {
            terminalRef.current?.write(message.data);
          }
          return;
        }
        if (message.type === "sessionIds" && Array.isArray(message.ids)) {
          setSessionIds(
            message.ids.filter(
              (sessionId): sessionId is string => typeof sessionId === "string",
            ),
          );
          setActiveSessionId(
            typeof message.activeId === "string" ? message.activeId : null,
          );
          return;
        }
        if (message.type === "ptyUpdate") {
          controlActiveRef.current = false;
          setControlActive(false);
          if (typeof message.sessionId === "string") {
            setActiveSessionId(message.sessionId);
          }
          awaitingBufferReplayRef.current = message.hasBuffer === true;
          if (!awaitingBufferReplayRef.current) {
            terminalRef.current?.reset();
          }
        }
      }),
    [runtimeSocket.subscribeJsonMessage],
  );

  useEffect(() => {
    const connected = runtimeSocket.status === "connected";
    setTerminalInputEnabled(terminalRef.current, connected);
    if (!connected) {
      awaitingBufferReplayRef.current = false;
      controlActiveRef.current = false;
      setControlActive(false);
      return;
    }
    runtimeSocket.sendJsonMessage({
      type: "size",
      data: terminalSizeRef.current,
    });
  }, [runtimeSocket.sendJsonMessage, runtimeSocket.status]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const sendInput = useCallback(
    async (data: string) => {
      if (
        runtimeSocket.status !== "connected" ||
        awaitingBufferReplayRef.current
      ) {
        return;
      }

      let terminalData = data;
      if (controlActiveRef.current) {
        controlActiveRef.current = false;
        setControlActive(false);
        const controlCharacter = getControlCharacter(data);
        if (controlCharacter !== null) {
          terminalData = controlCharacter;
        }
      }
      runtimeSocket.sendJsonMessage({ type: "terminal", data: terminalData });
    },
    [runtimeSocket.sendJsonMessage, runtimeSocket.status],
  );

  const sendSize = useCallback(
    async (rows: number, cols: number) => {
      terminalSizeRef.current = { cols, rows };
      runtimeSocket.sendJsonMessage({
        type: "size",
        data: terminalSizeRef.current,
      });
    },
    [runtimeSocket.sendJsonMessage],
  );

  const markTerminalReady = useCallback(async () => {
    const connected = runtimeSocket.status === "connected";
    setTerminalInputEnabled(terminalRef.current, connected);
    setTerminalReady(true);
    if (connected) {
      runtimeSocket.sendJsonMessage({ type: "clientReady" });
      runtimeSocket.sendJsonMessage({
        type: "size",
        data: terminalSizeRef.current,
      });
    }
  }, [runtimeSocket.sendJsonMessage, runtimeSocket.status]);

  const resetControlModifier = () => {
    controlActiveRef.current = false;
    setControlActive(false);
  };

  const sendKey = (data: string) => {
    resetControlModifier();
    if (awaitingBufferReplayRef.current) return;
    if (!runtimeSocket.sendJsonMessage({ type: "terminal", data })) {
      Alert.alert(
        "Terminal disconnected",
        "Wait for it to reconnect and try again.",
      );
    }
    terminalRef.current?.focus();
  };

  const closeTerminalSession = (sessionId: string, index: number) => {
    Alert.alert(
      `Close terminal ${index + 1}?`,
      "This will end the terminal session. Any running command in this terminal will be stopped.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close terminal",
          style: "destructive",
          onPress: () => {
            runtimeSocket.sendJsonMessage({
              type: "endSession",
              data: { sessionId },
            });
          },
        },
      ],
    );
  };

  const statusColor =
    runtimeSocket.status === "connected"
      ? "#10b981"
      : runtimeSocket.status === "connecting"
        ? "#f59e0b"
        : "#ef4444";

  if (runtime.isPending) {
    return (
      <TerminalStateScreen
        loading
        message="Loading runtime…"
        onBack={goBack}
        theme={theme}
      />
    );
  }

  if (runtime.isError) {
    return (
      <TerminalStateScreen
        message="Could not load this runtime. Check your connection and try again."
        onBack={goBack}
        theme={theme}
      />
    );
  }

  if (!runtime.instance) {
    return (
      <TerminalStateScreen
        message="Resume this project session before opening its terminal."
        onBack={goBack}
        theme={theme}
      />
    );
  }

  if (!localToken || !runtime.accessToken) {
    return (
      <TerminalStateScreen
        message="Terminal credentials are unavailable for this runtime."
        onBack={goBack}
        theme={theme}
      />
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <View
        style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}
      >
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={goBack}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: "chevron.left", android: "arrow_back" }}
            size={20}
            tintColor={theme.text}
          />
        </Pressable>
        <View style={styles.titleRow}>
          <SymbolView
            name={{ ios: "apple.terminal", android: "terminal" }}
            size={17}
            tintColor={theme.textSecondary}
          />
          <ThemedText numberOfLines={1} style={styles.title}>
            {projectName} Terminal
          </ThemedText>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
        <Pressable
          accessibilityLabel="Show keyboard"
          accessibilityRole="button"
          onPress={() => terminalRef.current?.focus()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: "keyboard", android: "keyboard" }}
            size={20}
            tintColor={theme.textSecondary}
          />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.terminalArea}
      >
        <View
          style={[
            styles.sessions,
            { borderBottomColor: theme.backgroundSelected },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.sessionTabs}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {sessionIds.map((sessionId, index) => {
              const active = sessionId === activeSessionId;
              return (
                <View
                  key={sessionId}
                  style={[
                    styles.sessionGroup,
                    {
                      backgroundColor: active
                        ? theme.text
                        : theme.backgroundElement,
                    },
                  ]}
                >
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    disabled={runtimeSocket.status !== "connected"}
                    onPress={() => {
                      if (
                        runtimeSocket.sendJsonMessage({
                          type: "switchSession",
                          data: { sessionId },
                        })
                      ) {
                        resetControlModifier();
                        setActiveSessionId(sessionId);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.sessionTab,
                      runtimeSocket.status !== "connected" && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.sessionLabel,
                        active && { color: theme.background },
                      ]}
                    >
                      Terminal {index + 1}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Close terminal ${index + 1}`}
                    accessibilityRole="button"
                    disabled={runtimeSocket.status !== "connected"}
                    hitSlop={4}
                    onPress={() => closeTerminalSession(sessionId, index)}
                    style={({ pressed }) => [
                      styles.closeSession,
                      runtimeSocket.status !== "connected" && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={{ ios: "xmark", android: "close" }}
                      size={13}
                      tintColor={
                        active ? theme.background : theme.textSecondary
                      }
                      weight="semibold"
                    />
                  </Pressable>
                </View>
              );
            })}
            <Pressable
              accessibilityLabel="Add terminal"
              accessibilityRole="button"
              disabled={runtimeSocket.status !== "connected"}
              onPress={() =>
                runtimeSocket.sendJsonMessage({ type: "newSession" })
              }
              style={({ pressed }) => [
                styles.addSession,
                { borderColor: theme.backgroundSelected },
                runtimeSocket.status !== "connected" && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{ ios: "plus", android: "add" }}
                size={16}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </ScrollView>
        </View>

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
          style={[styles.keyBar, { borderTopColor: theme.backgroundSelected }]}
        >
          <Pressable
            accessibilityLabel={
              controlActive
                ? "Disable Control modifier"
                : "Enable Control modifier"
            }
            accessibilityRole="button"
            accessibilityState={{ selected: controlActive }}
            disabled={runtimeSocket.status !== "connected"}
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
              runtimeSocket.status !== "connected" && styles.disabled,
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
          ].map(([label, data]) => (
            <Pressable
              accessibilityLabel={`Send ${label}`}
              accessibilityRole="button"
              disabled={runtimeSocket.status !== "connected"}
              key={label}
              onPress={() => sendKey(data)}
              style={({ pressed }) => [
                styles.key,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
                runtimeSocket.status !== "connected" && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.keyLabel}>{label}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TerminalStateScreen({
  loading = false,
  message,
  onBack,
  theme,
}: {
  loading?: boolean;
  message: string;
  onBack: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
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
  addSession: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: "center",
    width: 38,
  },
  closeSession: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  disabled: { opacity: 0.45 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    height: 56,
    paddingHorizontal: 12,
  },
  headerButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
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
  keyBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexGrow: 0,
  },
  keyLabel: { fontSize: 12, fontWeight: "700" },
  keys: { gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  pressed: { opacity: 0.65 },
  screen: { flex: 1 },
  sessionLabel: { fontSize: 12, fontWeight: "700" },
  sessionGroup: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    overflow: "hidden",
  },
  sessions: { borderBottomWidth: StyleSheet.hairlineWidth },
  sessionTab: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    minWidth: 88,
    paddingHorizontal: 12,
  },
  sessionTabs: { gap: 7, paddingHorizontal: 10, paddingVertical: 8 },
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
  terminalFrame: { backgroundColor: "#000000", flex: 1 },
  title: { flexShrink: 1, fontSize: 15, fontWeight: "700" },
  titleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minWidth: 0,
  },
});
