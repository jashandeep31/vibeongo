import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import Toast, {
  type ToastConfig,
  type ToastConfigParams,
  type ToastType,
} from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

const toastConfig: ToastConfig = {
  success: (params) => <AppToast {...params} variant="success" />,
  error: (params) => <AppToast {...params} variant="error" />,
  info: (params) => <AppToast {...params} variant="info" />,
};

export function AppToastHost() {
  return <Toast config={toastConfig} topOffset={58} visibilityTime={2600} />;
}

function AppToast({
  onPress,
  text1,
  text2,
  variant,
}: ToastConfigParams<unknown> & { variant: ToastType }) {
  const theme = useTheme();
  const isSuccess = variant === "success";
  const isError = variant === "error";
  const accentColor = isSuccess ? "#22c55e" : isError ? "#ef4444" : "#3c87f7";

  return (
    <Pressable
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      onPress={onPress}
      style={({ pressed }) => [
        styles.toast,
        {
          backgroundColor: theme.background,
          borderColor: theme.backgroundSelected,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: `${accentColor}1A` }]}>
        <SymbolView
          name={
            isSuccess
              ? { ios: "checkmark", android: "check" }
              : isError
                ? { ios: "exclamationmark", android: "priority_high" }
                : { ios: "info", android: "info" }
          }
          size={16}
          tintColor={accentColor}
          weight="bold"
        />
      </View>
      <View style={styles.copy}>
        {text1 ? (
          <ThemedText numberOfLines={2} style={styles.title}>
            {text1}
          </ThemedText>
        ) : null}
        {text2 ? (
          <ThemedText
            numberOfLines={2}
            style={styles.description}
            themeColor="textSecondary"
          >
            {text2}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    flexDirection: "row",
    gap: 11,
    maxWidth: 420,
    minHeight: 56,
    paddingHorizontal: 13,
    paddingVertical: 10,
    shadowColor: "#000000",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    width: "92%",
  },
  icon: {
    alignItems: "center",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  pressed: {
    opacity: 0.82,
  },
});
