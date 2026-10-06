import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useNotificationPermission } from "@/lib/notification-permission";

// inline warning shown while the os notification permission is off
export function NotificationPermissionWarning({
  style,
}: {
  style?: ViewStyle;
}) {
  const { permission, enable } = useNotificationPermission();
  if (!permission || permission.granted) return null;

  return (
    <View
      accessibilityLabel="Notifications are turned off"
      style={[styles.warning, style]}
    >
      <SymbolView
        name={{ ios: "bell.slash.fill", android: "notifications_off" }}
        size={16}
        tintColor="#f59e0b"
      />
      <View style={styles.copy}>
        <ThemedText style={styles.title}>Notifications are off</ThemedText>
        <ThemedText style={styles.description} themeColor="textSecondary">
          Turn them on to know when your tasks and automations finish.
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        hitSlop={6}
        onPress={() => void enable()}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <ThemedText style={styles.buttonLabel}>Turn on</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  warning: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.45)",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: "700",
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
  },
  button: {
    backgroundColor: "#f59e0b",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  buttonLabel: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
  },
});
