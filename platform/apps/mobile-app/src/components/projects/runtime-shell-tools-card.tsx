import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import type { RuntimeSocketMessage } from "@/hooks/use-vibeongo-runtime-socket";
import { useTheme } from "@/hooks/use-theme";

const MOSHI_LINK_PATTERN = /(moshi:\/\/\S+)/;

type RuntimeShellToolsCardProps = {
  isConnected: boolean;
  sendJsonMessage: (message: unknown) => boolean;
  subscribeJsonMessage: (
    listener: (message: RuntimeSocketMessage) => void,
  ) => () => void;
};

export function RuntimeShellToolsCard({
  isConnected,
  sendJsonMessage,
  subscribeJsonMessage,
}: RuntimeShellToolsCardProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const outputRef = useRef<ScrollView>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const moshiLink = useMemo(
    () =>
      output
        .map((line) => line.match(MOSHI_LINK_PATTERN)?.[1])
        .find((link): link is string => Boolean(link)),
    [output],
  );

  useEffect(
    () =>
      subscribeJsonMessage((message) => {
        if (
          message.type !== "shelltools" ||
          !message.data ||
          typeof message.data !== "object" ||
          Array.isArray(message.data)
        ) {
          return;
        }

        const data = message.data as Record<string, unknown>;
        if (data.tool !== "moshi" || typeof data.output !== "string") return;

        setOutput((current) => [...current, data.output as string]);
        if (
          data.stream === "stdout" ||
          data.stream === "stderr" ||
          data.stream === "error" ||
          (data.stream === "status" && data.output === "Moshi setup finished")
        ) {
          setIsStarting(false);
        }
      }),
    [subscribeJsonMessage],
  );

  const startMoshi = () => {
    if (!isConnected || isStarting) return;
    setOutput([]);
    setIsDrawerOpen(true);
    setIsStarting(true);
    const sent = sendJsonMessage({
      type: "shelltools",
      data: { tool: "moshi", action: "start" },
    });
    if (!sent) {
      setIsStarting(false);
      Alert.alert("Could not start Moshi", "The runtime is not connected.");
    }
  };

  const openMoshi = async () => {
    if (!moshiLink) return;
    try {
      await Linking.openURL(moshiLink);
    } catch {
      Alert.alert("Could not open Moshi", moshiLink);
    }
  };

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
        <View style={styles.toolIcon}>
          <SymbolView
            name={{ ios: "apple.terminal", android: "terminal" }}
            size={22}
            tintColor={theme.text}
          />
        </View>
        <View style={styles.copy}>
          <ThemedText style={styles.title}>Moshi</ThemedText>
          <ThemedText style={styles.description} themeColor="textSecondary">
            Set up the Moshi shell tool on this instance.
          </ThemedText>
        </View>
        <Pressable
          accessibilityLabel="Start Moshi"
          accessibilityRole="button"
          disabled={!isConnected || isStarting}
          onPress={startMoshi}
          style={({ pressed }) => [
            styles.startButton,
            { borderColor: theme.backgroundSelected },
            (!isConnected || isStarting) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {isStarting ? (
            <ActivityIndicator color={theme.text} size="small" />
          ) : (
            <SymbolView
              name={{ ios: "play.fill", android: "play_arrow" }}
              size={15}
              tintColor={theme.text}
            />
          )}
          <ThemedText style={styles.startLabel}>
            {isStarting ? "Starting…" : "Start"}
          </ThemedText>
        </Pressable>
      </View>

      <Modal
        animationType="none"
        onRequestClose={() => setIsDrawerOpen(false)}
        statusBarTranslucent
        transparent
        visible={isDrawerOpen}
      >
        <View style={styles.root}>
          <Pressable
            accessibilityLabel="Close Moshi output"
            accessibilityRole="button"
            onPress={() => setIsDrawerOpen(false)}
            style={styles.backdrop}
          />
          <BottomDrawerPanel
            accessibilityViewIsModal
            visible={isDrawerOpen}
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
            <View style={styles.drawerHeader}>
              <ThemedText style={styles.drawerTitle}>Moshi</ThemedText>
              {moshiLink ? (
                <Pressable
                  accessibilityLabel="Open Moshi"
                  accessibilityRole="link"
                  onPress={() => void openMoshi()}
                  style={({ pressed }) => [
                    styles.openButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.openLabel}>Open Direct</ThemedText>
                  <SymbolView
                    name={{
                      ios: "arrow.up.right.square",
                      android: "open_in_new",
                    }}
                    size={15}
                    tintColor="#3c87f7"
                  />
                </Pressable>
              ) : null}
            </View>
            <ScrollView
              contentContainerStyle={styles.outputContent}
              nestedScrollEnabled
              onContentSizeChange={() =>
                outputRef.current?.scrollToEnd({ animated: true })
              }
              ref={outputRef}
              style={[
                styles.output,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              {output.length ? (
                <ScrollView
                  contentContainerStyle={styles.horizontalOutputContent}
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator
                >
                  <ThemedText style={styles.outputText}>
                    {output.join("\n")}
                  </ThemedText>
                </ScrollView>
              ) : (
                <View style={styles.emptyOutput}>
                  {isStarting ? <ActivityIndicator size="small" /> : null}
                  <ThemedText themeColor="textSecondary">
                    {isStarting ? "Waiting for output…" : "No output yet."}
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </BottomDrawerPanel>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
    minHeight: 78,
    padding: 12,
  },
  copy: { flex: 1 },
  description: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  disabled: { opacity: 0.4 },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    height: "80%",
    maxWidth: 620,
    paddingHorizontal: 20,
    position: "absolute",
    width: "100%",
  },
  drawerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  drawerTitle: { fontSize: 19, fontWeight: "700" },
  emptyOutput: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 300,
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 16,
    marginTop: 8,
    width: 36,
  },
  horizontalOutputContent: { padding: 12 },
  openButton: { alignItems: "center", flexDirection: "row", gap: 5 },
  openLabel: { color: "#3c87f7", fontSize: 13, fontWeight: "700" },
  output: { borderRadius: 12, flex: 1 },
  outputContent: { flexGrow: 1 },
  outputText: {
    flexShrink: 0,
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: { opacity: 0.7 },
  root: { flex: 1 },
  startButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  startLabel: { fontSize: 12, fontWeight: "700" },
  title: { fontSize: 15, fontWeight: "700" },
  toolIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
});
