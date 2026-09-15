import {
  useOpencodeMcpServers,
  useToggleOpencodeMcpServer,
} from "@repo/api-hooks";
import * as WebBrowser from "expo-web-browser";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import { AddProjectMcpDrawer } from "@/components/projects/add-project-mcp-drawer";
import { useTheme } from "@/hooks/use-theme";

export type OpencodeWorkspaceConnection = {
  chatId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
  directory: string;
};

const STATUS_COLORS = {
  connected: "#10b981",
  disabled: "#8b8d98",
  failed: "#ef4444",
  needs_auth: "#f59e0b",
  pending: "#3b82f6",
} as const;

export function ProjectMcpDrawer({
  connection,
  onClose,
  visible,
}: {
  connection: OpencodeWorkspaceConnection;
  onClose: () => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [addVisible, setAddVisible] = useState(false);
  const awaitingAuthorizationRef = useRef(false);
  const servers = useOpencodeMcpServers(connection, visible);
  const toggle = useToggleOpencodeMcpServer(connection);

  useEffect(() => {
    if (!visible) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !awaitingAuthorizationRef.current) return;
      awaitingAuthorizationRef.current = false;
      void servers.refetch();
    });
    return () => subscription.remove();
  }, [servers.refetch, visible]);

  const toggleServer = (name: string) => {
    toggle.mutate(name, {
      onError: (error) =>
        Alert.alert("Could not update MCP server", error.message),
      onSuccess: async ({ authorizationUrl }) => {
        if (!authorizationUrl) return;
        awaitingAuthorizationRef.current = true;
        try {
          const result = await WebBrowser.openBrowserAsync(authorizationUrl);
          if (result.type !== "opened" && awaitingAuthorizationRef.current) {
            awaitingAuthorizationRef.current = false;
            await servers.refetch();
          }
        } catch (error) {
          awaitingAuthorizationRef.current = false;
          Alert.alert(
            "Could not open authorization",
            error instanceof Error
              ? error.message
              : "Open the authorization page again.",
          );
        }
      },
    });
  };

  const list = servers.data ?? [];
  return (
    <>
      <Modal
        animationType="none"
        onRequestClose={onClose}
        transparent
        visible={visible}
      >
        <View style={styles.root}>
          <Pressable
            accessibilityLabel="Close MCP servers"
            onPress={onClose}
            style={styles.backdrop}
          />
          <BottomDrawerPanel
            accessibilityViewIsModal
            style={[
              styles.drawer,
              {
                backgroundColor: theme.background,
                borderColor: theme.backgroundSelected,
                paddingBottom: Math.max(insets.bottom, 18),
              },
            ]}
            visible={visible}
          >
            <View
              style={[
                styles.handle,
                { backgroundColor: theme.backgroundSelected },
              ]}
            />
            <View style={styles.header}>
              <View style={styles.heading}>
                <ThemedText style={styles.title}>MCP servers</ThemedText>
                <ThemedText style={styles.subtitle} themeColor="textSecondary">
                  Tools connected to this workspace
                </ThemedText>
              </View>
              <Pressable
                accessibilityLabel="Refresh MCP servers"
                accessibilityRole="button"
                onPress={() => void servers.refetch()}
                style={styles.headerAction}
              >
                {servers.isFetching ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <SymbolView
                    name={{ ios: "arrow.clockwise", android: "refresh" }}
                    size={18}
                    tintColor={theme.textSecondary}
                  />
                )}
              </Pressable>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                onPress={onClose}
                style={styles.headerAction}
              >
                <SymbolView
                  name={{ ios: "xmark", android: "close" }}
                  size={19}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            </View>

            {servers.isPending ? (
              <View style={styles.center}>
                <ActivityIndicator />
                <ThemedText themeColor="textSecondary">
                  Loading servers…
                </ThemedText>
              </View>
            ) : servers.isError ? (
              <View style={styles.center}>
                <ThemedText style={styles.errorTitle}>
                  Could not load MCP servers
                </ThemedText>
                <ThemedText
                  style={styles.centerCopy}
                  themeColor="textSecondary"
                >
                  {servers.error.message}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void servers.refetch()}
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <ThemedText style={styles.buttonText}>Retry</ThemedText>
                </Pressable>
              </View>
            ) : (
              <FlatList
                contentContainerStyle={
                  list.length ? styles.list : styles.emptyList
                }
                data={list}
                keyExtractor={(server) => server.name}
                ListEmptyComponent={
                  <View style={styles.center}>
                    <SymbolView
                      name={{ ios: "server.rack", android: "dns" }}
                      size={30}
                      tintColor={theme.textSecondary}
                    />
                    <ThemedText style={styles.errorTitle}>
                      No servers configured
                    </ThemedText>
                    <ThemedText
                      style={styles.centerCopy}
                      themeColor="textSecondary"
                    >
                      Add a local command or remote MCP endpoint.
                    </ThemedText>
                  </View>
                }
                renderItem={({ item }) => {
                  const status = item.status.status;
                  const pending =
                    status === "pending" ||
                    (toggle.isPending && toggle.variables === item.name);
                  return (
                    <View
                      style={[
                        styles.server,
                        { borderColor: theme.backgroundSelected },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: STATUS_COLORS[status] },
                        ]}
                      />
                      <View style={styles.serverCopy}>
                        <ThemedText numberOfLines={1} style={styles.serverName}>
                          {item.name}
                        </ThemedText>
                        <ThemedText
                          numberOfLines={2}
                          style={styles.statusText}
                          themeColor="textSecondary"
                        >
                          {status === "needs_auth"
                            ? "Sign in required"
                            : status === "failed"
                              ? item.status.error
                              : status.replace("_", " ")}
                        </ThemedText>
                      </View>
                      {pending ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <Switch
                          accessibilityLabel={`${status === "connected" ? "Disable" : "Enable"} ${item.name}`}
                          disabled={pending}
                          onValueChange={() => toggleServer(item.name)}
                          value={status === "connected"}
                        />
                      )}
                    </View>
                  );
                }}
              />
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => setAddVisible(true)}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: theme.text },
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{ ios: "plus", android: "add" }}
                size={18}
                tintColor={theme.background}
              />
              <ThemedText
                style={[styles.buttonText, { color: theme.background }]}
              >
                Add MCP server
              </ThemedText>
            </Pressable>
          </BottomDrawerPanel>
        </View>
      </Modal>
      <AddProjectMcpDrawer
        connection={connection}
        onClose={() => setAddVisible(false)}
        visible={addVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.42)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  buttonText: { fontSize: 14, fontWeight: "700" },
  center: {
    alignItems: "center",
    gap: 9,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  centerCopy: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    height: "76%",
    maxWidth: 680,
    paddingHorizontal: 18,
    position: "absolute",
    width: "100%",
  },
  emptyList: { flex: 1, justifyContent: "center" },
  errorTitle: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 12,
    marginTop: 8,
    width: 36,
  },
  header: { alignItems: "center", flexDirection: "row", paddingBottom: 12 },
  headerAction: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  heading: { flex: 1, gap: 2 },
  list: { gap: 9, paddingBottom: 16, paddingTop: 8 },
  pressed: { opacity: 0.7 },
  root: { flex: 1, justifyContent: "flex-end" },
  secondaryButton: {
    borderRadius: 12,
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  server: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 11,
    minHeight: 68,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  serverCopy: { flex: 1, gap: 3 },
  serverName: { fontSize: 14, fontWeight: "600" },
  statusDot: { borderRadius: 5, height: 9, width: 9 },
  statusText: { fontSize: 12, textTransform: "capitalize" },
  subtitle: { fontSize: 12 },
  title: { fontSize: 18, fontWeight: "700" },
});
