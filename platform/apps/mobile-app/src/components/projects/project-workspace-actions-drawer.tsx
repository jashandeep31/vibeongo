import { SymbolView, type SymbolViewProps } from "expo-symbols";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export function ProjectWorkspaceActionsDrawer({
  isRefreshing,
  onClose,
  onFiles,
  onMcp,
  onRefresh,
  onSettings,
  visible,
}: {
  isRefreshing: boolean;
  onClose: () => void;
  onFiles: () => void;
  onMcp?: () => void;
  onRefresh: () => void;
  onSettings: () => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const act = (callback: () => void) => () => {
    onClose();
    requestAnimationFrame(callback);
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close workspace actions"
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
            <ThemedText style={styles.title}>Workspace actions</ThemedText>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.close}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close" }}
                size={19}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>
          <ActionRow
            icon={{ ios: "folder", android: "folder" }}
            label="Files"
            onPress={act(onFiles)}
          />
          <ActionRow
            icon={{ ios: "slider.horizontal.3", android: "tune" }}
            label="Runtime settings"
            onPress={act(onSettings)}
          />
          {onMcp ? (
            <ActionRow
              icon={{ ios: "server.rack", android: "dns" }}
              label="MCP servers"
              onPress={act(onMcp)}
            />
          ) : null}
          <ActionRow
            icon={{ ios: "arrow.clockwise", android: "refresh" }}
            label="Refresh chat"
            onPress={act(onRefresh)}
            pending={isRefreshing}
          />
        </BottomDrawerPanel>
      </View>
    </Modal>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  pending = false,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  onPress: () => void;
  pending?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={pending}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}
    >
      {pending ? (
        <ActivityIndicator size="small" />
      ) : (
        <SymbolView name={icon} size={19} tintColor={theme.textSecondary} />
      )}
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <SymbolView
        name={{ ios: "chevron.right", android: "chevron_right" }}
        size={16}
        tintColor={theme.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.42)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  close: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    maxWidth: 680,
    paddingHorizontal: 18,
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
  header: { alignItems: "center", flexDirection: "row", marginBottom: 6 },
  pressed: { opacity: 0.62 },
  root: { flex: 1, justifyContent: "flex-end" },
  row: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 14,
    minHeight: 54,
    paddingHorizontal: 12,
  },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  title: { flex: 1, fontSize: 18, fontWeight: "700" },
});
