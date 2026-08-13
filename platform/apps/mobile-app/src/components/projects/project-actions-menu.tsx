import type { Project } from "@repo/api-client";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

type ProjectActionsMenuProps = {
  anchorY: number;
  onClose: () => void;
  onDelete: (project: Project) => void;
  onNewSession: (project: Project) => void;
  project: Project | null;
};

export function ProjectActionsMenu({
  anchorY,
  onClose,
  onDelete,
  onNewSession,
  project,
}: ProjectActionsMenuProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const menuTop = Math.max(insets.top + 8, Math.min(anchorY - 8, height - 190));

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={Boolean(project)}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close project menu"
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
            icon={{ ios: "plus", android: "add" }}
            label="New session"
            onPress={() => {
              if (project) onNewSession(project);
            }}
          />
          <MenuItem
            disabled
            icon={{ ios: "pencil", android: "edit" }}
            label="Edit project"
            subtitle="Coming soon"
          />
          <View
            style={[
              styles.separator,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
          <MenuItem
            destructive
            icon={{ ios: "trash", android: "delete" }}
            label="Delete project"
            onPress={() => {
              if (project) onDelete(project);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  destructive = false,
  disabled = false,
  subtitle,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  subtitle?: string;
}) {
  const theme = useTheme();
  const color = destructive ? "#ef4444" : theme.text;
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
      <SymbolView name={icon} size={18} tintColor={color} />
      <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
      {subtitle ? (
        <ThemedText style={styles.subtitle} themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    width: 220,
  },
  item: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 11,
    minHeight: 45,
    paddingHorizontal: 11,
  },
  label: { flex: 1, fontSize: 14, fontWeight: "600" },
  subtitle: { fontSize: 11 },
  separator: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  disabled: { opacity: 0.42 },
});
