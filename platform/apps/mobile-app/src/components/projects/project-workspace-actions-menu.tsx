import { SymbolView, type SymbolViewProps } from "expo-symbols";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export function ProjectWorkspaceActionsMenu({
  anchorY,
  isRefreshing,
  onClose,
  onFiles,
  onFork,
  onMcp,
  onRefresh,
  onSettings,
  visible,
}: {
  anchorY: number;
  isRefreshing: boolean;
  onClose: () => void;
  onFiles: () => void;
  onFork?: () => void;
  onMcp?: () => void;
  onRefresh: () => void;
  onSettings: () => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const itemCount = 3 + (onMcp ? 1 : 0) + (onFork ? 1 : 0);
  const menuHeight = itemCount * 45 + 10;
  const menuTop = Math.max(
    insets.top + 8,
    Math.min(anchorY + 18, height - insets.bottom - menuHeight - 8),
  );
  const act = (callback: () => void) => () => {
    onClose();
    requestAnimationFrame(callback);
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
          accessibilityLabel="Close workspace actions"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.menu,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
              top: menuTop,
            },
          ]}
        >
          <MenuItem
            icon={{ ios: "folder", android: "folder" }}
            label="Files"
            onPress={act(onFiles)}
          />
          {onFork ? (
            <MenuItem
              icon={{ ios: "arrow.triangle.branch", android: "account_tree" }}
              label="Fork chat"
              onPress={act(onFork)}
            />
          ) : null}
          <MenuItem
            icon={{ ios: "slider.horizontal.3", android: "tune" }}
            label="Runtime settings"
            onPress={act(onSettings)}
          />
          {onMcp ? (
            <MenuItem
              icon={{ ios: "server.rack", android: "dns" }}
              label="MCP servers"
              onPress={act(onMcp)}
            />
          ) : null}
          <MenuItem
            disabled={isRefreshing}
            icon={{ ios: "arrow.clockwise", android: "refresh" }}
            label={isRefreshing ? "Refreshing chat…" : "Refresh chat"}
            onPress={act(onRefresh)}
            pending={isRefreshing}
          />
        </View>
      </View>
    </Modal>
  );
}

function MenuItem({
  disabled = false,
  icon,
  label,
  onPress,
  pending = false,
}: {
  disabled?: boolean;
  icon: SymbolViewProps["name"];
  label: string;
  onPress: () => void;
  pending?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        disabled && styles.disabled,
        pressed && { backgroundColor: theme.backgroundElement },
      ]}
    >
      {pending ? (
        <ActivityIndicator size="small" />
      ) : (
        <SymbolView name={icon} size={18} tintColor={theme.text} />
      )}
      <ThemedText style={styles.label}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.48 },
  item: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 11,
    minHeight: 45,
    paddingHorizontal: 11,
  },
  label: { flex: 1, fontSize: 14, fontWeight: "600" },
  menu: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 10,
    overflow: "hidden",
    padding: 5,
    position: "absolute",
    right: 18,
    shadowColor: "#000000",
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    width: 230,
  },
  root: { flex: 1 },
});
