import { useRotateProjectAutomationTriggerToken } from "@repo/api-hooks";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { getApiErrorMessage } from "./automation-utils";

export function RotateTriggerTokenDrawer({
  automationId,
  onClose,
  triggerId,
  triggerName,
  visible,
}: {
  automationId: string;
  onClose: () => void;
  triggerId: string;
  triggerName: string;
  visible: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const rotate = useRotateProjectAutomationTriggerToken();
  const [secret, setSecret] = useState<string | null>(null);
  useEffect(() => {
    if (visible) setSecret(null);
  }, [visible]);

  const close = () => {
    if (!rotate.isPending) onClose();
  };
  const performRotate = async () => {
    try {
      const response = await rotate.mutateAsync({ automationId, triggerId });
      setSecret(response.data.secret);
      Toast.show({ type: "success", text1: "Integration token rotated" });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not rotate token",
        text2: getApiErrorMessage(error, "Try again."),
      });
    }
  };
  const copy = async () => {
    if (!secret) return;
    await Clipboard.setStringAsync(secret);
    Toast.show({ type: "success", text1: "Webhook token copied" });
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close token drawer"
          onPress={close}
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
          <ThemedText style={styles.title}>Rotate integration token</ThemedText>
          <ThemedText style={styles.description} themeColor="textSecondary">
            Rotating {triggerName} immediately invalidates the current token.
            The new token is shown only once.
          </ThemedText>
          {secret ? (
            <View style={styles.secretBlock}>
              <ThemedText style={styles.label}>New webhook token</ThemedText>
              <ThemedText
                selectable
                style={[
                  styles.secret,
                  { backgroundColor: theme.backgroundElement },
                ]}
              >
                {secret}
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.actions}>
            <Action
              label={secret ? "Copy token" : "Cancel"}
              onPress={secret ? () => void copy() : close}
            />
            <Action
              destructive={!secret}
              label={secret ? "Done" : "Rotate token"}
              loading={rotate.isPending}
              onPress={secret ? close : () => void performRotate()}
              primary={Boolean(secret)}
            />
          </View>
        </BottomDrawerPanel>
      </View>
    </Modal>
  );
}

function Action({
  destructive = false,
  label,
  loading = false,
  onPress,
  primary = false,
}: {
  destructive?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  primary?: boolean;
}) {
  const theme = useTheme();
  const backgroundColor = destructive
    ? "#dc2626"
    : primary
      ? theme.text
      : theme.backgroundElement;
  const color = destructive
    ? "#ffffff"
    : primary
      ? theme.background
      : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor },
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <ThemedText style={[styles.actionText, { color }]}>{label}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: 11,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
  },
  actionText: { fontSize: 14, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginTop: 24 },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.38)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  description: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  drawer: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    borderRadius: 999,
    height: 4,
    marginBottom: 17,
    width: 38,
  },
  label: { fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.65 },
  root: { flex: 1, justifyContent: "flex-end" },
  secret: {
    borderRadius: 10,
    fontFamily: "monospace",
    fontSize: 12,
    padding: 12,
  },
  secretBlock: { gap: 8, marginTop: 20 },
  title: { fontSize: 21, fontWeight: "700" },
});
