import {
  EMPTY_TERMINAL_WORKSPACE,
  useTerminalWorkspaceStore,
} from "@repo/app-store";
import { SymbolView } from "expo-symbols";
import { Fragment, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ProjectTerminalDirectoryDrawer } from "@/components/projects/project-terminal-directory-drawer";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  attachVibeongoTmuxTerminalSession,
  createVibeongoTerminalSession,
} from "@/hooks/use-vibeongo-ws-v2";

export function ProjectTerminalSwitcherDrawer({
  accessToken,
  currentTerminalId,
  localToken,
  onClose,
  onSelect,
  projectSessionId,
  runtimeUrl,
  visible,
}: {
  accessToken: string;
  currentTerminalId: string;
  localToken: string;
  onClose: () => void;
  onSelect: (terminalId: string) => void;
  projectSessionId: string;
  runtimeUrl: string;
  visible: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [isCreating, setIsCreating] = useState(false);
  const [attachingTmuxTarget, setAttachingTmuxTarget] = useState("");
  const [directoryDrawerVisible, setDirectoryDrawerVisible] = useState(false);
  const workspace = useTerminalWorkspaceStore(
    (store) => store.workspaces[projectSessionId] ?? EMPTY_TERMINAL_WORKSPACE,
  );

  useEffect(() => {
    if (!visible) setDirectoryDrawerVisible(false);
  }, [visible]);

  const createTerminal = async (workingDirectory?: string) => {
    if (isCreating || attachingTmuxTarget) return;
    setDirectoryDrawerVisible(false);
    setIsCreating(true);
    try {
      const terminalId = await createVibeongoTerminalSession({
        accessToken,
        localToken,
        runtimeUrl,
        workingDirectory,
      });
      onSelect(terminalId);
    } catch (error) {
      Alert.alert(
        "Could not create terminal",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const attachTmuxTerminal = async (
    tmuxSessionName: string,
    tmuxWindowId?: string,
  ) => {
    if (isCreating || attachingTmuxTarget) return;
    setAttachingTmuxTarget(
      tmuxWindowId ? `${tmuxSessionName}:${tmuxWindowId}` : tmuxSessionName,
    );
    try {
      const terminalId = await attachVibeongoTmuxTerminalSession({
        accessToken,
        localToken,
        runtimeUrl,
        tmuxSessionName,
        tmuxWindowId,
      });
      onSelect(terminalId);
    } catch (error) {
      Alert.alert(
        "Could not attach to tmux",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setAttachingTmuxTarget("");
    }
  };

  return (
    <Fragment>
      <Modal
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent
        transparent
        visible={visible && !directoryDrawerVisible}
      >
        <View style={styles.root}>
          <Pressable
            accessibilityLabel="Close terminal switcher"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.backdrop}
          />
          <BottomDrawerPanel
            accessibilityViewIsModal
            visible={visible}
            style={[
              styles.drawer,
              {
                backgroundColor: theme.background,
                borderColor: theme.backgroundSelected,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View
              style={[
                styles.handle,
                { backgroundColor: theme.backgroundSelected },
              ]}
            />
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <ThemedText style={styles.title}>Terminal sessions</ThemedText>
                <ThemedText style={styles.subtitle} themeColor="textSecondary">
                  {workspace.terminalSessionIds.length} open ·{" "}
                  {workspace.status}
                </ThemedText>
              </View>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                onPress={onClose}
                style={styles.close}
              >
                <SymbolView
                  name={{ ios: "xmark", android: "close" }}
                  size={18}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                accessibilityLabel="New terminal session"
                accessibilityRole="button"
                disabled={Boolean(isCreating || attachingTmuxTarget)}
                onPress={() => setDirectoryDrawerVisible(true)}
                style={({ pressed }) => [
                  styles.newTerminal,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                  Boolean(isCreating || attachingTmuxTarget) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.iconTile,
                    { backgroundColor: theme.backgroundSelected },
                  ]}
                >
                  {isCreating ? (
                    <ActivityIndicator color={theme.text} size="small" />
                  ) : (
                    <SymbolView
                      name={{ ios: "plus", android: "add" }}
                      size={18}
                      tintColor={theme.text}
                    />
                  )}
                </View>
                <View style={styles.rowCopy}>
                  <ThemedText style={styles.rowTitle}>New terminal</ThemedText>
                  <ThemedText style={styles.rowMeta} themeColor="textSecondary">
                    Open a fresh shell
                  </ThemedText>
                </View>
                <SymbolView
                  name={{ ios: "arrow.up.right", android: "north_east" }}
                  size={16}
                  tintColor={theme.textSecondary}
                />
              </Pressable>

              <View style={styles.list}>
                {workspace.terminalSessions.map((terminalSession) => {
                  const terminalId = terminalSession.id;
                  const selected = terminalId === currentTerminalId;
                  const active =
                    terminalId === workspace.activeTerminalSessionId;
                  const terminalLabel = terminalSession.name;
                  return (
                    <Pressable
                      accessibilityLabel={`Open ${terminalLabel}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={terminalId}
                      onPress={() => onSelect(terminalId)}
                      style={({ pressed }) => [
                        styles.terminal,
                        {
                          backgroundColor: selected
                            ? theme.backgroundElement
                            : "transparent",
                          borderColor: selected
                            ? theme.backgroundSelected
                            : "transparent",
                        },
                        pressed && { backgroundColor: theme.backgroundElement },
                      ]}
                    >
                      <View
                        style={[
                          styles.iconTile,
                          { backgroundColor: theme.backgroundElement },
                        ]}
                      >
                        <SymbolView
                          name={{ ios: "apple.terminal", android: "terminal" }}
                          size={16}
                          tintColor={theme.textSecondary}
                        />
                      </View>
                      <View style={styles.rowCopy}>
                        <View style={styles.nameRow}>
                          <ThemedText style={styles.rowTitle}>
                            {terminalLabel}
                          </ThemedText>
                          {active ? <View style={styles.activeDot} /> : null}
                        </View>
                        <ThemedText
                          numberOfLines={1}
                          style={styles.identifier}
                          themeColor="textSecondary"
                        >
                          {terminalId}
                        </ThemedText>
                      </View>
                      {selected ? (
                        <SymbolView
                          name={{
                            ios: "checkmark.circle.fill",
                            android: "check_circle",
                          }}
                          size={19}
                          tintColor="#10b981"
                        />
                      ) : (
                        <SymbolView
                          name={{
                            ios: "chevron.right",
                            android: "chevron_right",
                          }}
                          size={17}
                          tintColor={theme.textSecondary}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {workspace.tmuxSessions.length ? (
                <View style={styles.tmuxSection}>
                  <ThemedText style={styles.sectionTitle}>
                    Tmux sessions
                  </ThemedText>
                  {workspace.tmuxSessions.map((session) => (
                    <View key={session.name}>
                      <Pressable
                        accessibilityLabel={`Attach to tmux session ${session.name}`}
                        accessibilityRole="button"
                        disabled={Boolean(isCreating || attachingTmuxTarget)}
                        onPress={() => void attachTmuxTerminal(session.name)}
                        style={[
                          styles.tmuxRow,
                          {
                            backgroundColor: theme.backgroundElement,
                            borderColor: theme.backgroundSelected,
                          },
                        ]}
                      >
                        {attachingTmuxTarget === session.name ? (
                          <ActivityIndicator
                            color={theme.textSecondary}
                            size="small"
                          />
                        ) : (
                          <SymbolView
                            name={{
                              ios: "rectangle.split.2x1",
                              android: "view_agenda",
                            }}
                            size={16}
                            tintColor={theme.textSecondary}
                          />
                        )}
                        <ThemedText numberOfLines={1} style={styles.tmuxName}>
                          {session.name}
                        </ThemedText>
                        <ThemedText
                          style={styles.rowMeta}
                          themeColor="textSecondary"
                        >
                          {session.windows.length} windows
                        </ThemedText>
                      </Pressable>
                      {session.windows.map((window) => (
                        <Pressable
                          accessibilityLabel={`Attach to ${session.name} window ${window.name}`}
                          accessibilityRole="button"
                          disabled={Boolean(isCreating || attachingTmuxTarget)}
                          key={`${session.name}:${window.id}`}
                          onPress={() =>
                            void attachTmuxTerminal(session.name, window.id)
                          }
                          style={styles.tmuxWindowRow}
                        >
                          {attachingTmuxTarget ===
                          `${session.name}:${window.id}` ? (
                            <ActivityIndicator
                              color={theme.textSecondary}
                              size="small"
                            />
                          ) : (
                            <SymbolView
                              name={{
                                ios: "chevron.right",
                                android: "chevron_right",
                              }}
                              size={15}
                              tintColor={theme.textSecondary}
                            />
                          )}
                          <ThemedText
                            numberOfLines={1}
                            style={styles.tmuxWindowName}
                          >
                            {window.name}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </BottomDrawerPanel>
        </View>
      </Modal>
      <ProjectTerminalDirectoryDrawer
        dirs={workspace.favoriteDirs}
        disabled={Boolean(isCreating || attachingTmuxTarget)}
        onClose={() => setDirectoryDrawerVisible(false)}
        onSelect={(workingDirectory) => void createTerminal(workingDirectory)}
        visible={visible && directoryDrawerVisible}
      />
    </Fragment>
  );
}

const styles = StyleSheet.create({
  activeDot: {
    backgroundColor: "#10b981",
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.46)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  close: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  content: { paddingBottom: 36, paddingTop: 16 },
  disabled: { opacity: 0.5 },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    height: "72%",
    maxWidth: 680,
    paddingHorizontal: 16,
    position: "absolute",
    width: "100%",
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 12,
    marginTop: 8,
    width: 36,
  },
  header: { alignItems: "center", flexDirection: "row", paddingHorizontal: 4 },
  headerCopy: { flex: 1 },
  iconTile: {
    alignItems: "center",
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  identifier: { fontFamily: Fonts.mono, fontSize: 11, lineHeight: 16 },
  list: { gap: 4, marginTop: 14 },
  nameRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  newTerminal: {
    alignItems: "center",
    borderRadius: 14,
    borderStyle: "dashed",
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 12,
  },
  pressed: { opacity: 0.66 },
  root: { flex: 1, justifyContent: "flex-end" },
  rowCopy: { flex: 1, minWidth: 0 },
  rowMeta: { fontSize: 11, lineHeight: 16 },
  rowTitle: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  subtitle: { fontSize: 12, lineHeight: 18 },
  terminal: {
    alignItems: "center",
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 10,
  },
  title: { fontSize: 18, fontWeight: "700" },
  tmuxName: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: "600",
  },
  tmuxRow: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  tmuxSection: { gap: 8, marginTop: 28 },
  tmuxWindowName: { flex: 1, fontFamily: Fonts.mono, fontSize: 12 },
  tmuxWindowRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 18,
  },
});
