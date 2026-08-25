import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { PAGE_CHROME } from "@/constants/page-chrome";
import { useTheme } from "@/hooks/use-theme";

type ChromeInsets = { bottomInset: number; topInset: number };

export function PageChromeLayout({
  bottom,
  children,
  top,
}: {
  bottom?: ReactNode;
  children: (insets: ChromeInsets) => ReactNode;
  top?: ReactNode;
}) {
  const theme = useTheme();
  const [topInset, setTopInset] = useState(
    top ? PAGE_CHROME.header.estimatedInset : 0,
  );
  const [bottomInset, setBottomInset] = useState(
    bottom ? PAGE_CHROME.bottom.estimatedInset : 0,
  );
  const updateTopInset = (event: LayoutChangeEvent) =>
    setTopInset(event.nativeEvent.layout.height);
  const updateBottomInset = (event: LayoutChangeEvent) =>
    setBottomInset(event.nativeEvent.layout.height);

  return (
    <View style={styles.screen}>
      {children({ bottomInset, topInset })}
      {top ? (
        <View
          onLayout={updateTopInset}
          pointerEvents="box-none"
          style={styles.topChrome}
        >
          <ChromeGradient color={theme.background} edge="top" />
          {top}
        </View>
      ) : null}
      {bottom ? (
        <View
          onLayout={updateBottomInset}
          pointerEvents="box-none"
          style={styles.bottomChrome}
        >
          <ChromeGradient color={theme.background} edge="bottom" />
          {bottom}
        </View>
      ) : null}
    </View>
  );
}

export function PageHeader({
  accessibilityLabel,
  left,
  onBack,
  onTitlePress,
  right,
  title,
  titleContainerStyle,
  titleLeading,
  titleTextStyle,
  titleTrailing,
  titleOpacity,
  titleVariant = "plain",
}: {
  accessibilityLabel?: string;
  left?: ReactNode;
  onBack?: () => void;
  onTitlePress?: () => void;
  right?: ReactNode;
  title: string;
  titleContainerStyle?: StyleProp<ViewStyle>;
  titleLeading?: ReactNode;
  titleTextStyle?: StyleProp<TextStyle>;
  titleTrailing?: ReactNode;
  titleOpacity?: Animated.AnimatedInterpolation<number>;
  titleVariant?: "pill" | "plain";
}) {
  const theme = useTheme();
  const titleContent = (
    <>
      {titleLeading}
      <ThemedText numberOfLines={1} style={[styles.title, titleTextStyle]}>
        {title}
      </ThemedText>
      {titleTrailing}
    </>
  );

  return (
    <View style={styles.header}>
      {left ??
        (onBack ? (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ ios: "chevron.left", android: "arrow_back" }}
              size={19}
              tintColor={theme.text}
            />
          </Pressable>
        ) : (
          <View style={styles.action} />
        ))}

      {titleVariant === "pill" ? (
        <Pressable
          accessibilityLabel={accessibilityLabel ?? title}
          accessibilityRole={onTitlePress ? "button" : "text"}
          disabled={!onTitlePress}
          onPress={onTitlePress}
          style={({ pressed }) => [
            styles.titlePill,
            { backgroundColor: theme.backgroundElement },
            titleContainerStyle,
            pressed && styles.pressed,
          ]}
        >
          {titleContent}
        </Pressable>
      ) : (
        <Animated.View
          style={[
            styles.plainTitle,
            titleOpacity ? { opacity: titleOpacity } : null,
          ]}
        >
          {titleContent}
        </Animated.View>
      )}

      {right ?? <View style={styles.action} />}
    </View>
  );
}

export function usePageTitleScrollFade() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const titleOpacity = scrollY.interpolate({
    extrapolate: "clamp",
    inputRange: [0, PAGE_CHROME.header.titleFadeDistance],
    outputRange: [1, 0],
  });
  const onTitleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.setValue(Math.max(0, event.nativeEvent.contentOffset.y));
  };

  return { onTitleScroll, titleOpacity };
}

function ChromeGradient({
  color,
  edge,
}: {
  color: string;
  edge: "bottom" | "top";
}) {
  const opacities =
    edge === "top" ? PAGE_CHROME.top.opacities : PAGE_CHROME.bottom.opacities;
  const colors = opacities.map(
    (opacity) =>
      `${color}${Math.round(opacity * 255)
        .toString(16)
        .padStart(2, "0")}`,
  ) as unknown as readonly [string, string, ...string[]];

  return (
    <LinearGradient
      colors={colors}
      dither
      end={{ x: 0.5, y: 1 }}
      locations={
        edge === "top"
          ? PAGE_CHROME.top.locations
          : PAGE_CHROME.bottom.locations
      }
      pointerEvents="none"
      start={{ x: 0.5, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: PAGE_CHROME.header.actionSize / 2,
    height: PAGE_CHROME.header.actionSize,
    justifyContent: "center",
    width: PAGE_CHROME.header.actionSize,
  },
  bottomChrome: {
    bottom: 0,
    left: 0,
    paddingTop: PAGE_CHROME.bottom.extension,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: PAGE_CHROME.header.gap,
    paddingBottom: PAGE_CHROME.header.verticalPadding,
    paddingHorizontal: PAGE_CHROME.header.horizontalPadding,
    paddingTop: PAGE_CHROME.header.verticalPadding,
  },
  plainTitle: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 8,
  },
  pressed: { opacity: 0.7 },
  screen: { flex: 1 },
  title: { flexShrink: 1, fontSize: 15, fontWeight: "700", lineHeight: 20 },
  titlePill: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    height: PAGE_CHROME.header.pillHeight,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 14,
  },
  topChrome: {
    left: 0,
    paddingBottom: PAGE_CHROME.top.extension,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
});
