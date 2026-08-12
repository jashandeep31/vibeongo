import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppIcon } from "@/components/app-icon";
import {
  Radius,
  Spacing,
  TouchTarget,
  type AppColors,
} from "@/constants/theme";

type ConfirmationDialogProps = {
  colors: AppColors;
  confirmLabel: string;
  description: string;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

export function ConfirmationDialog({
  colors,
  confirmLabel,
  description,
  isPending = false,
  onCancel,
  onConfirm,
  title,
  visible,
}: ConfirmationDialogProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!isPending) onCancel();
      }}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close confirmation"
          disabled={isPending}
          onPress={onCancel}
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        />
        <View
          accessibilityRole="alert"
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <View
            style={[
              styles.icon,
              { backgroundColor: colors.destructiveSurface },
            ]}
          >
            <AppIcon
              name={{
                ios: "stop.fill",
                android: "stop_circle",
                web: "stop_circle",
              }}
              size={22}
              tintColor={colors.destructive}
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isPending}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.backgroundElement },
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[styles.buttonText, { color: colors.text }]}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isPending}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.destructive },
                (pressed || isPending) && styles.pressed,
              ]}
            >
              {isPending ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={[styles.buttonText, styles.confirmText]}>
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.five,
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  dialog: {
    borderRadius: Radius.large,
    elevation: 18,
    maxWidth: 380,
    padding: Spacing.six,
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    width: "100%",
  },
  icon: {
    alignItems: "center",
    borderRadius: Radius.pill,
    height: 46,
    justifyContent: "center",
    marginBottom: Spacing.four,
    width: 46,
  },
  title: { fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  description: { fontSize: 14, lineHeight: 20, marginTop: Spacing.two },
  actions: { flexDirection: "row", gap: Spacing.two, marginTop: Spacing.six },
  button: {
    alignItems: "center",
    borderRadius: Radius.pill,
    flex: 1,
    height: TouchTarget,
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
  },
  buttonText: { fontSize: 14, fontWeight: "700" },
  confirmText: { color: "#ffffff" },
  pressed: { opacity: 0.68 },
});
