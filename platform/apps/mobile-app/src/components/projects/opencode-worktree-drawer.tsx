import type { OpencodeWorktree } from "@repo/api-client";
import {
  useOpencodeWorktrees,
  useRemoveOpencodeWorktree,
} from "@repo/api-hooks";
import { SymbolView } from "expo-symbols";
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
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type OpencodeWorktreeConnection = {
  accessToken: string;
  chatId: string;
  password?: string;
  serverUrl: string;
};

export function OpencodeWorktreeDrawer({
  connection,
  currentDirectory,
  onClose,
  onSelect,
  visible,
}: {
  connection: OpencodeWorktreeConnection;
  currentDirectory?: string;
  onClose: () => void;
  onSelect: (directory: string) => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const worktreesQuery = useOpencodeWorktrees(
    connection.chatId,
    connection.serverUrl,
    connection.accessToken,
    currentDirectory,
    connection.password,
    visible,
  );
  const removeWorktree = useRemoveOpencodeWorktree(connection);
  const projectId = worktreesQuery.data?.projectId;
  const busy = removeWorktree.isPending;

  const remove = (worktree: OpencodeWorktree) => {
    if (!projectId) return;
    Alert.alert(
      "Remove worktree?",
      `${worktree.directory}\n\nThe folder is deleted. Uncommitted changes block removal.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () =>
            removeWorktree.mutate(
              { projectId, directory: worktree.directory },
              {
                onError: (error) =>
                  Alert.alert("Could not remove worktree", error.message),
              },
            ),
          style: "destructive",
          text: "Remove",
        },
      ],
    );
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close worktrees"
          accessibilityRole="button"
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
              paddingBottom: Math.max(insets.bottom, 16),
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
            <View style={styles.headerCopy}>
              <ThemedText style={styles.title}>Worktrees</ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                Pick a worktree to start a new chat in it.
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
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!currentDirectory ? (
              <ThemedText style={styles.state} themeColor="textSecondary">
                Open a chat inside a repository to use worktrees.
              </ThemedText>
            ) : worktreesQuery.isLoading ? (
              <ActivityIndicator style={styles.state} />
            ) : worktreesQuery.error ? (
              <ThemedText style={styles.state} themeColor="textSecondary">
                {worktreesQuery.error.message}
              </ThemedText>
            ) : (
              worktreesQuery.data?.worktrees.map((worktree) => (
                <WorktreeRow
                  current={worktree.directory === currentDirectory}
                  disabled={busy}
                  key={worktree.directory}
                  onPress={() => onSelect(worktree.directory)}
                  onRemove={
                    worktree.type === "worktree" &&
                    worktree.directory !== currentDirectory
                      ? () => remove(worktree)
                      : undefined
                  }
                  worktree={worktree}
                />
              ))
            )}
          </ScrollView>
        </BottomDrawerPanel>
      </View>
    </Modal>
  );
}

function WorktreeRow({
  current,
  disabled,
  onPress,
  onRemove,
  worktree,
}: {
  current: boolean;
  disabled: boolean;
  onPress: () => void;
  onRemove?: () => void;
  worktree: OpencodeWorktree;
}) {
  const theme = useTheme();
  const isRoot = worktree.type === "root";
  const folderName =
    worktree.directory.split("/").filter(Boolean).at(-1) ?? "Worktree";
  const name = isRoot ? `${folderName} (main)` : folderName;

  return (
    <Pressable
      accessibilityLabel={`Start a chat in ${name}`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: current ? theme.text : theme.backgroundSelected,
        },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[styles.iconTile, { backgroundColor: theme.backgroundSelected }]}
      >
        <SymbolView
          name={{
            ios: isRoot ? "folder" : "arrow.triangle.branch",
            android: isRoot ? "folder" : "account_tree",
          }}
          size={18}
          tintColor={theme.text}
        />
      </View>
      <View style={styles.rowCopy}>
        <ThemedText style={styles.rowTitle}>
          {name}
          {current ? " · current" : ""}
        </ThemedText>
        <ThemedText
          ellipsizeMode="head"
          numberOfLines={1}
          style={styles.path}
          themeColor="textSecondary"
        >
          {worktree.directory}
        </ThemedText>
      </View>
      {onRemove ? (
        <Pressable
          accessibilityLabel={`Remove ${name}`}
          accessibilityRole="button"
          disabled={disabled}
          hitSlop={8}
          onPress={onRemove}
          style={styles.close}
        >
          <SymbolView
            name={{ ios: "trash", android: "delete" }}
            size={17}
            tintColor={theme.textSecondary}
          />
        </Pressable>
      ) : (
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right" }}
          size={17}
          tintColor={theme.textSecondary}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  content: { gap: 8, paddingBottom: 36, paddingTop: 18 },
  disabled: { opacity: 0.5 },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    height: "68%",
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
  path: { fontFamily: Fonts.mono, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.66 },
  root: { flex: 1, justifyContent: "flex-end" },
  row: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 12,
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  state: { paddingVertical: 32, textAlign: "center" },
  subtitle: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  title: { fontSize: 18, fontWeight: "700" },
});
