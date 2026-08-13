import { SymbolView } from "expo-symbols";
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

export type SessionActionTarget = {
  id: string;
  name: string;
};

export function SessionActionsMenu({
  anchorY,
  onArchive,
  onClose,
  session,
}: {
  anchorY: number;
  onArchive: (session: SessionActionTarget) => void;
  onClose: () => void;
  session: SessionActionTarget | null;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const menuTop = Math.max(insets.top + 8, Math.min(anchorY - 8, height - 82));

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={Boolean(session)}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close session menu"
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
          <Pressable
            accessibilityRole="menuitem"
            onPress={() => {
              if (session) onArchive(session);
            }}
            style={({ pressed }) => [
              styles.item,
              pressed && { backgroundColor: theme.backgroundElement },
            ]}
          >
            <SymbolView
              name={{ ios: "archivebox", android: "archive" }}
              size={18}
              tintColor={theme.text}
            />
            <ThemedText style={styles.label}>Archive</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    width: 180,
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
});
