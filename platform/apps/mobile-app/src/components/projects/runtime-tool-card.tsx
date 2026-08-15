import * as Clipboard from "expo-clipboard";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import type { RuntimeSocketMessage } from "@/hooks/use-vibeongo-runtime-socket";
import { useTheme } from "@/hooks/use-theme";

type ToolStatus = "stopped" | "starting" | "started" | "stopping";
type ToolKind = "opencode" | "codex";
type T3TokenAction = "open" | "copy" | "copy-url" | "external";

type RuntimeToolCardProps = {
  disabled?: boolean;
  isConnected: boolean;
  lastMessage: RuntimeSocketMessage | null;
  opencodePassword?: string | null;
  sendJsonMessage: (message: unknown) => boolean;
  tool: ToolKind;
  url: string;
};

export function RuntimeToolCard({
  disabled = false,
  isConnected,
  lastMessage,
  opencodePassword,
  sendJsonMessage,
  tool,
  url,
}: RuntimeToolCardProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<ToolStatus>("stopped");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tokenActionRef = useRef<T3TokenAction | null>(null);
  const requestTokenAfterStartRef = useRef(false);
  const title = tool === "opencode" ? "OpenCode Web" : "T3 Code";
  const isRunning = status === "started";
  const isBusy = status === "starting" || status === "stopping";

  const sendAction = (
    action: "start" | "restart" | "stop" | "password" | "status",
  ) => sendJsonMessage({ type: "tool", data: { action, tool } });

  const openUrl = async (target: string) => {
    try {
      await Linking.openURL(target);
    } catch {
      Alert.alert(`Could not open ${title}`, target);
    }
  };

  const runT3TokenAction = async (action: T3TokenAction, token: string) => {
    const host = url.replace(/\/$/, "");
    const encodedHost = encodeURIComponent(host);
    const encodedToken = encodeURIComponent(token);
    const pairUrl = `https://app.t3.codes/pair?host=${encodedHost}#token=${encodedToken}`;
    const connectionValue = `${host}?#token=${encodedToken}`;
    if (action === "copy") {
      await Clipboard.setStringAsync(token);
    } else if (action === "copy-url") {
      await Clipboard.setStringAsync(pairUrl);
    } else {
      await Clipboard.setStringAsync(connectionValue);
      try {
        await Linking.openURL("t3code://connections/new");
      } catch {
        await openUrl(pairUrl);
      }
    }
  };

  useEffect(() => {
    if (!isConnected) return;
    sendAction("status");
    // Status should be requested once after each socket connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  useEffect(() => {
    if (
      lastMessage?.type !== "tool" ||
      !lastMessage.data ||
      typeof lastMessage.data !== "object" ||
      Array.isArray(lastMessage.data)
    )
      return;

    const data = lastMessage.data as Record<string, unknown>;
    if (data.tool !== tool || typeof data.status !== "boolean") return;
    const nextStatus: ToolStatus = data.status ? "started" : "stopped";
    const nextError = typeof data.error === "string" ? data.error : null;
    const token = typeof data.password === "string" ? data.password.trim() : "";
    setStatus(nextStatus);
    setError(nextError);

    if (tool === "codex" && token && tokenActionRef.current) {
      const action = tokenActionRef.current;
      tokenActionRef.current = null;
      requestTokenAfterStartRef.current = false;
      setPendingAction(null);
      void runT3TokenAction(action, token);
    } else if (
      tool === "codex" &&
      !nextError &&
      nextStatus === "started" &&
      requestTokenAfterStartRef.current
    ) {
      requestTokenAfterStartRef.current = false;
      sendAction("password");
    } else if (
      tool === "opencode" &&
      !nextError &&
      nextStatus === "started" &&
      (pendingAction === "start" || pendingAction === "restart")
    ) {
      setPendingAction(null);
      void openUrl(url);
    } else {
      setPendingAction(null);
    }

    if (nextStatus === "stopped" || nextError) {
      tokenActionRef.current = null;
      requestTokenAfterStartRef.current = false;
    }
    // Actions intentionally consume each newly received socket message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage]);

  const startT3For = (action: T3TokenAction) => {
    if (disabled || !url || !isConnected || isBusy) return;
    tokenActionRef.current = action;
    setPendingAction(action);
    setError(null);
    if (isRunning) {
      sendAction("password");
    } else {
      setStatus("starting");
      requestTokenAfterStartRef.current = true;
      sendAction("start");
    }
  };

  const primaryAction = () => {
    if (tool === "codex") {
      startT3For("open");
      return;
    }
    if (isRunning) {
      void openUrl(url);
      return;
    }
    if (!isConnected) return;
    setStatus("starting");
    setPendingAction("start");
    setError(null);
    sendAction("start");
  };

  const restart = () => {
    setMenuOpen(false);
    if (!isConnected || isBusy) return;
    setStatus("starting");
    setPendingAction("restart");
    setError(null);
    if (tool === "codex") {
      tokenActionRef.current = "open";
      requestTokenAfterStartRef.current = true;
    }
    sendAction("restart");
  };

  const stop = () => {
    setMenuOpen(false);
    if (!isConnected || !isRunning) return;
    setStatus("stopping");
    setPendingAction("stop");
    setError(null);
    tokenActionRef.current = null;
    requestTokenAfterStartRef.current = false;
    sendAction("stop");
  };

  const chooseTokenAction = (action: T3TokenAction) => {
    setMenuOpen(false);
    startT3For(action);
  };

  const primaryLabel = isBusy
    ? status === "stopping"
      ? "Stopping…"
      : "Starting…"
    : pendingAction === "open"
      ? "Opening…"
      : isRunning
        ? "Open"
        : "Start";

  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <ThemedText numberOfLines={1} style={styles.title}>
            {title}
          </ThemedText>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isRunning ? "#10b981" : "#ef4444" },
            ]}
          />
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={`${isRunning ? "Open" : "Start"} ${title}`}
            accessibilityRole="button"
            disabled={
              disabled ||
              !url ||
              !isConnected ||
              isBusy ||
              Boolean(pendingAction)
            }
            onPress={primaryAction}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              (disabled || !url || !isConnected || isBusy) && styles.disabled,
            ]}
          >
            {isBusy || pendingAction ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <SymbolView
                name={{ ios: "globe", android: "public" }}
                size={16}
                tintColor="#ffffff"
              />
            )}
            <ThemedText style={styles.primaryLabel}>{primaryLabel}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityLabel={`${title} actions`}
            accessibilityRole="button"
            disabled={disabled || !url}
            onPress={() => setMenuOpen(true)}
            style={({ pressed }) => [
              styles.menuButton,
              { borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
              (disabled || !url) && styles.disabled,
            ]}
          >
            <SymbolView
              name={{ ios: "ellipsis", android: "more_horiz" }}
              size={19}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        </View>
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      </View>

      <Modal
        animationType="none"
        onRequestClose={() => setMenuOpen(false)}
        statusBarTranslucent
        transparent
        visible={menuOpen}
      >
        <View style={styles.root}>
          <Pressable
            accessibilityLabel={`Close ${title} actions`}
            accessibilityRole="button"
            onPress={() => setMenuOpen(false)}
            style={styles.backdrop}
          />
          <BottomDrawerPanel
            accessibilityViewIsModal
            visible={menuOpen}
            style={[
              styles.drawer,
              {
                backgroundColor: theme.background,
                borderColor: theme.backgroundSelected,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View
              style={[
                styles.handle,
                { backgroundColor: theme.backgroundSelected },
              ]}
            />
            <ThemedText style={styles.drawerTitle}>{title}</ThemedText>
            <ToolAction
              icon={{ ios: "arrow.clockwise", android: "refresh" }}
              label="Restart"
              onPress={restart}
            />
            <ToolAction
              disabled={!isRunning}
              icon={{ ios: "stop.fill", android: "stop" }}
              label="Stop"
              onPress={stop}
            />
            {tool === "opencode" && opencodePassword ? (
              <ToolAction
                icon={{ ios: "doc.on.doc", android: "content_copy" }}
                label="Copy password"
                onPress={() => {
                  setMenuOpen(false);
                  void Clipboard.setStringAsync(opencodePassword);
                }}
              />
            ) : null}
            {tool === "codex" ? (
              <>
                <ToolAction
                  disabled={!isRunning}
                  icon={{ ios: "key", android: "key" }}
                  label="Get pairing token"
                  onPress={() => chooseTokenAction("copy")}
                />
                <ToolAction
                  icon={{ ios: "link", android: "link" }}
                  label="Copy pairing URL"
                  onPress={() => chooseTokenAction("copy-url")}
                />
                <ToolAction
                  icon={{
                    ios: "arrow.up.right.square",
                    android: "open_in_new",
                  }}
                  label="Open in T3 Code"
                  onPress={() => chooseTokenAction("external")}
                />
              </>
            ) : null}
          </BottomDrawerPanel>
        </View>
      </Modal>
    </>
  );
}

function ToolAction({
  disabled = false,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon: SymbolViewProps["name"];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerAction,
        { borderBottomColor: theme.backgroundSelected },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <SymbolView name={icon} size={18} tintColor={theme.textSecondary} />
      <ThemedText style={styles.drawerActionLabel}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: "center", flexDirection: "row", gap: 8 },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.38)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  card: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 70,
    padding: 12,
  },
  disabled: { opacity: 0.4 },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    maxWidth: 620,
    paddingHorizontal: 20,
    position: "absolute",
    width: "100%",
  },
  drawerAction: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 54,
  },
  drawerActionLabel: { fontSize: 15, fontWeight: "600" },
  drawerTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  error: {
    color: "#ef4444",
    fontSize: 12,
    position: "absolute",
    bottom: 2,
    left: 12,
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 16,
    marginTop: 8,
    width: 36,
  },
  menuButton: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  pressed: { opacity: 0.7 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#3c87f7",
    borderRadius: 9,
    flexDirection: "row",
    gap: 6,
    height: 38,
    justifyContent: "center",
    minWidth: 86,
    paddingHorizontal: 12,
  },
  primaryLabel: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  root: { flex: 1, justifyContent: "flex-end" },
  statusDot: { borderRadius: 5, height: 9, width: 9 },
  title: { flexShrink: 1, fontSize: 15, fontWeight: "700" },
  titleRow: { alignItems: "center", flex: 1, flexDirection: "row", gap: 8 },
});
