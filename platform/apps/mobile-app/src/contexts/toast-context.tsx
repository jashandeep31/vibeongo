import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ToastVariant = "error" | "info" | "success";

export type ToastOptions = {
  duration?: number;
  message: string;
  title?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  dismissToast: () => void;
  showToast: (options: ToastOptions | string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const animation = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<ToastOptions | null>(null);

  const clearTimer = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const dismissToast = useCallback(() => {
    clearTimer();
    Animated.timing(animation, {
      duration: 170,
      easing: Easing.in(Easing.cubic),
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [animation, clearTimer]);

  const showToast = useCallback(
    (options: ToastOptions | string) => {
      clearTimer();
      const next = typeof options === "string" ? { message: options } : options;
      setToast({ variant: "info", ...next });
      animation.stopAnimation();
      animation.setValue(0);
      requestAnimationFrame(() => {
        Animated.spring(animation, {
          damping: 18,
          mass: 0.8,
          stiffness: 230,
          toValue: 1,
          useNativeDriver: true,
        }).start();
      });
      timerRef.current = setTimeout(dismissToast, next.duration ?? 3200);
    },
    [animation, clearTimer, dismissToast],
  );

  useEffect(() => clearTimer, [clearTimer]);

  const value = useMemo(
    () => ({ dismissToast, showToast }),
    [dismissToast, showToast],
  );

  const variant = toast?.variant ?? "info";
  const accent =
    variant === "success"
      ? colors.success
      : variant === "error"
        ? colors.destructive
        : colors.brand;
  const surface =
    variant === "success"
      ? colors.successSurface
      : variant === "error"
        ? colors.destructiveSurface
        : colors.surface;
  const icon =
    variant === "success"
      ? ({ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" } as const)
      : variant === "error"
        ? ({ ios: "exclamationmark.circle.fill", android: "error", web: "error" } as const)
        : ({ ios: "info.circle.fill", android: "info", web: "info" } as const);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          <Animated.View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[
              styles.position,
              {
                opacity: animation,
                top: insets.top + Spacing.three,
                transform: [
                  {
                    translateY: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                  {
                    scale: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.97, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Pressable
              accessibilityLabel="Dismiss notification"
              onPress={dismissToast}
              style={[
                styles.toast,
                {
                  backgroundColor: surface,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <AppIcon name={icon} size={21} tintColor={accent} />
              <View style={styles.copy}>
                {toast.title ? (
                  <Text style={[styles.title, { color: colors.text }]}>
                    {toast.title}
                  </Text>
                ) : null}
                <Text
                  numberOfLines={3}
                  style={[styles.message, { color: toast.title ? colors.textSecondary : colors.text }]}
                >
                  {toast.message}
                </Text>
              </View>
              <AppIcon
                name={{ ios: "xmark", android: "close", web: "close" }}
                size={15}
                tintColor={colors.textSecondary}
              />
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 1000 },
  position: {
    alignSelf: "center",
    left: Spacing.four,
    maxWidth: 520,
    position: "absolute",
    right: Spacing.four,
  },
  toast: {
    alignItems: "center",
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 12,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 58,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  copy: { flex: 1 },
  title: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  message: { fontSize: 12, lineHeight: 17 },
});
