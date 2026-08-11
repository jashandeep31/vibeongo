import { BlurView } from "expo-blur";
import type { RefObject } from "react";
import { Pressable, StyleSheet, Text, View, type ColorSchemeName } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { Radius, Spacing, TouchTarget, type AppColors } from "@/constants/theme";

type FloatingScreenHeaderProps = {
  blurTarget: RefObject<View | null>;
  colors: AppColors;
  colorScheme: ColorSchemeName | null | undefined;
  onBack: () => void;
  title: string;
};

export function FloatingScreenHeader({
  blurTarget,
  colors,
  colorScheme,
  onBack,
  title,
}: FloatingScreenHeaderProps) {
  const isDark = colorScheme === "dark";
  const glassFill = isDark ? "rgba(24, 24, 27, 0.56)" : "rgba(255, 255, 255, 0.58)";
  const blurProps = {
    blurMethod: "dimezisBlurView" as const,
    blurReductionFactor: 2.8,
    blurTarget,
    intensity: 38,
    tint: isDark ? ("dark" as const) : ("light" as const),
  };

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <BlurView
        {...blurProps}
        style={[styles.glass, styles.backGlass, { borderColor: colors.border }]}
      >
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: glassFill }]} />
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.backPressable, pressed && styles.pressed]}
        >
          <AppIcon
            name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
            size={20}
            tintColor={colors.text}
          />
        </Pressable>
      </BlurView>

      <BlurView
        {...blurProps}
        pointerEvents="none"
        style={[styles.glass, styles.titleGlass, { borderColor: colors.border }]}
      >
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: glassFill }]} />
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
      </BlurView>
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
    paddingHorizontal: Spacing.four,
  },
  title: { fontSize: 14, fontWeight: "700", maxWidth: "100%" },
  pressed: { opacity: 0.55 },
});
