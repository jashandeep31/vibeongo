import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { useTheme } from "@/hooks/use-theme";

type ConfirmationDrawerProps = {
  confirmDelaySeconds?: number;
  confirmLabel: string;
  description: string;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

export function ConfirmationDrawer({
  confirmDelaySeconds = 0,
  confirmLabel,
  description,
  isConfirming = false,
  onCancel,
  onConfirm,
  title,
  visible,
}: ConfirmationDrawerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (!visible) {
      setSecondsRemaining(0);
      return;
    }

    setSecondsRemaining(confirmDelaySeconds);
    if (confirmDelaySeconds === 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [confirmDelaySeconds, visible]);

  const isConfirmDisabled = secondsRemaining > 0 || isConfirming;

  return (
    <Modal
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Cancel confirmation"
          accessibilityRole="button"
          onPress={onCancel}
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
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.description} themeColor="textSecondary">
            {description}
          </ThemedText>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.actionLabel}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              accessibilityLabel={
                isConfirming
                  ? `${confirmLabel} in progress`
                  : isConfirmDisabled
                    ? `${confirmLabel}, available in ${secondsRemaining} seconds`
                    : confirmLabel
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: isConfirmDisabled }}
              disabled={isConfirmDisabled}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.action,
                styles.destructiveAction,
                isConfirmDisabled && styles.disabledAction,
                pressed && styles.pressed,
              ]}
            >
              {isConfirming ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <ThemedText style={styles.destructiveLabel}>
                  {confirmLabel}
                </ThemedText>
              )}
              {secondsRemaining > 0 ? (
                <View style={styles.countdownBadge}>
                  <ThemedText style={styles.countdownText}>
                    {secondsRemaining}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
          </View>
        </BottomDrawerPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.38)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  countdownBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    width: 20,
  },
  countdownText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  destructiveAction: {
    backgroundColor: "#dc2626",
  },
  destructiveLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    left: 0,
    position: "absolute",
    right: 0,
    textAlign: "center",
  },
  disabledAction: {
    opacity: 0.45,
  },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    maxWidth: 620,
    paddingHorizontal: 20,
    position: "absolute",
    width: "100%",
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 16,
    marginTop: 8,
    width: 36,
  },
  pressed: {
    opacity: 0.72,
  },
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
  },
});
