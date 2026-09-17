import type { PermissionRequest } from "@repo/api-client";
import { ActivityIndicator } from "react-native";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export function OpencodePermissionPrompt({
  isSubmitting,
  onReply,
  request,
}: {
  isSubmitting: boolean;
  onReply: (requestId: string, decision: "once" | "always" | "reject") => void;
  request: PermissionRequest;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="none" transparent statusBarTranslucent visible>
      <View style={styles.backdrop} />
      <BottomDrawerPanel
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
            marginBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <View style={styles.handle} />
        <ThemedText style={styles.eyebrow}>Permission required</ThemedText>
        <ThemedText style={styles.title}>{request.action}</ThemedText>
        {request.message ? (
          <ThemedText style={{ color: theme.textSecondary }}>
            {request.message}
          </ThemedText>
        ) : null}
        {request.resources.map((resource) => (
          <ThemedText
            key={resource}
            numberOfLines={2}
            style={[styles.resource, { backgroundColor: theme.background }]}
          >
            {resource}
          </ThemedText>
        ))}
        <View style={styles.actions}>
          <Action
            disabled={isSubmitting}
            label="Deny"
            onPress={() => onReply(request.id, "reject")}
            theme={theme}
          />
          <Action
            disabled={isSubmitting}
            label="Allow once"
            onPress={() => onReply(request.id, "once")}
            primary
            theme={theme}
          />
          <Action
            disabled={isSubmitting}
            label="Always allow"
            onPress={() => onReply(request.id, "always")}
            theme={theme}
          />
        </View>
        {isSubmitting ? <ActivityIndicator style={styles.spinner} /> : null}
      </BottomDrawerPanel>
    </Modal>
  );
}

function Action({
  disabled,
  label,
  onPress,
  primary,
  theme,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  primary?: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: primary ? theme.text : theme.background,
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <ThemedText
        style={{
          color: primary ? theme.background : theme.text,
          fontWeight: "700",
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,.42)" },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    gap: 10,
    left: 8,
    padding: 18,
    position: "absolute",
    right: 8,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "#888",
    borderRadius: 2,
    height: 4,
    marginBottom: 4,
    width: 36,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.7,
    textTransform: "uppercase",
  },
  title: { fontSize: 18, fontWeight: "800" },
  resource: {
    borderRadius: 8,
    fontFamily: "monospace",
    fontSize: 12,
    padding: 9,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  action: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  spinner: { marginTop: 2 },
});
