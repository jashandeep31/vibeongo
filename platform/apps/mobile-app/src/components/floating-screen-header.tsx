import { BlurView } from "expo-blur";
import {
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorSchemeName,
} from "react-native";

import { AppIcon } from "@/components/app-icon";
import {
  Radius,
  Spacing,
  TouchTarget,
  type AppColors,
} from "@/constants/theme";

type FloatingScreenHeaderProps = {
  actions?: ReactNode;
  blurTarget: RefObject<View | null>;
  colors: AppColors;
  colorScheme: ColorSchemeName | null | undefined;
  onBack: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTitlePress?: () => void;
  title: string;
  wideTitle?: boolean;
};

export function FloatingScreenHeader({
  actions,
  blurTarget,
  colors,
  colorScheme,
  onBack,
  onSwipeLeft,
  onSwipeRight,
  onTitlePress,
  title,
  wideTitle = false,
}: FloatingScreenHeaderProps) {
  const isDark = colorScheme === "dark";
  const glassFill = isDark
    ? "rgba(8, 8, 8, 0.82)"
    : "rgba(255, 255, 255, 0.58)";
  const blurProps = {
    blurMethod: "dimezisBlurView" as const,
    blurReductionFactor: 2.8,
    blurTarget,
    intensity: 38,
    tint: isDark ? ("dark" as const) : ("light" as const),
  };
  const titleIsInteractive = Boolean(
    onTitlePress || onSwipeLeft || onSwipeRight,
  );
  const titleTranslateX = useRef(new Animated.Value(0)).current;
  const settleTitle = useCallback(
    () =>
      Animated.spring(titleTranslateX, {
        damping: 18,
        mass: 0.7,
        stiffness: 220,
        toValue: 0,
        useNativeDriver: true,
      }).start(),
    [titleTranslateX],
  );
  const animateChatChange = useCallback(
    (direction: -1 | 1, change?: () => void) => {
      if (!change) {
        settleTitle();
        return;
      }
      Animated.timing(titleTranslateX, {
        duration: 120,
        toValue: direction * 72,
        useNativeDriver: true,
      }).start(() => {
        change();
        titleTranslateX.setValue(direction * -54);
        settleTitle();
      });
    },
    [settleTitle, titleTranslateX],
  );
  const titlePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dx) > 6 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 6 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => titleTranslateX.stopAnimation(),
        onPanResponderMove: (_, gesture) =>
          titleTranslateX.setValue(Math.max(-42, Math.min(42, gesture.dx))),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -24) animateChatChange(-1, onSwipeLeft);
          else if (gesture.dx > 24) animateChatChange(1, onSwipeRight);
          else settleTitle();
        },
        onPanResponderTerminate: settleTitle,
        onShouldBlockNativeResponder: () => true,
      }),
    [
      animateChatChange,
      onSwipeLeft,
      onSwipeRight,
      settleTitle,
      titleTranslateX,
    ],
  );

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <BlurView
        {...blurProps}
        style={[styles.glass, styles.backGlass, { borderColor: colors.border }]}
      >
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: glassFill }]}
        />
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [
            styles.backPressable,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon
            name={{
              ios: "chevron.left",
              android: "arrow_back",
              web: "arrow_back",
            }}
            size={20}
            tintColor={colors.text}
          />
        </Pressable>
      </BlurView>

      <BlurView
        {...blurProps}
        pointerEvents={titleIsInteractive ? "auto" : "none"}
        style={[
          styles.glass,
          styles.titleGlass,
          actions ? styles.titleWithActions : undefined,
          wideTitle ? styles.wideTitle : undefined,
          { borderColor: colors.border },
        ]}
      >
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: glassFill }]}
        />
        <Animated.View
          style={[
            styles.animatedTitle,
            { transform: [{ translateX: titleTranslateX }] },
          ]}
          {...titlePanResponder.panHandlers}
        >
          <Pressable
            accessibilityHint={
              titleIsInteractive
                ? "Tap for options or swipe to change chat"
                : undefined
            }
            accessibilityLabel={title}
            accessibilityRole={titleIsInteractive ? "button" : undefined}
            disabled={!titleIsInteractive}
            onPress={onTitlePress}
            style={styles.titlePressable}
          >
            {onSwipeRight ? (
              <AppIcon
                name={{
                  ios: "chevron.left",
                  android: "chevron_left",
                  web: "chevron_left",
                }}
                size={11}
                tintColor={colors.textSecondary}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.text }]}
            >
              {title}
            </Text>
            {onSwipeLeft ? (
              <AppIcon
                name={{
                  ios: "chevron.right",
                  android: "chevron_right",
                  web: "chevron_right",
                }}
                size={11}
                tintColor={colors.textSecondary}
              />
            ) : null}
          </Pressable>
        </Animated.View>
      </BlurView>

      {actions ? (
        <BlurView
          {...blurProps}
          style={[
            styles.glass,
            styles.actionsGlass,
            { borderColor: colors.border },
          ]}
        >
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: glassFill }]}
          />
          <View style={styles.actions}>{actions}</View>
        </BlurView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    left: Spacing.four,
    position: "absolute",
    right: Spacing.four,
    top: Spacing.two,
    zIndex: 20,
  },
  glass: {
    borderColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 5,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  backGlass: {
    borderRadius: Radius.pill,
    height: TouchTarget,
    left: 0,
    position: "absolute",
    width: TouchTarget,
  },
  backPressable: { alignItems: "center", flex: 1, justifyContent: "center" },
  titleGlass: {
    alignItems: "center",
    borderRadius: Radius.pill,
    height: 40,
    justifyContent: "center",
    maxWidth: "68%",
  },
  titleWithActions: { maxWidth: "46%" },
  wideTitle: {
    left: TouchTarget + Spacing.two,
    maxWidth: "100%",
    position: "absolute",
    right: TouchTarget * 2 + Spacing.two,
  },
  animatedTitle: { height: "100%", width: "100%" },
  titlePressable: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.one,
    height: "100%",
    justifyContent: "center",
    maxWidth: "100%",
    paddingHorizontal: Spacing.four,
  },
  actionsGlass: {
    borderRadius: Radius.pill,
    height: TouchTarget,
    position: "absolute",
    right: 0,
  },
  actions: { alignItems: "center", flexDirection: "row" },
  title: { fontSize: 14, fontWeight: "700", maxWidth: "100%" },
  pressed: { opacity: 0.55 },
});
