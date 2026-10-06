import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// React Native port of `Blocks` from loading-dev (web-only): a 3×3 grid whose
// cells shrink and grow back in a diagonal sweep.
const SIDE = 3;
const STEPS = SIDE * 2 - 1;
const CELLS = Array.from({ length: SIDE * SIDE }, (_, index) => ({
  col: index % SIDE,
  row: Math.floor(index / SIDE),
}));

export function BlocksLoader({
  color,
  duration = 1570,
  size = 10,
}: {
  color: string;
  duration?: number;
  size?: number;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(progress);
  }, [duration, progress, reduceMotion]);

  const gap = size * 0.1;
  const cellSize = (size - gap * (SIDE - 1)) / SIDE;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.grid, { gap, height: size, width: size }]}
    >
      {CELLS.map(({ col, row }) => (
        <BlocksCell
          key={`${col}-${row}`}
          color={color}
          progress={progress}
          radius={size * 0.0625}
          reduceMotion={reduceMotion}
          size={cellSize}
          step={row + col}
        />
      ))}
    </View>
  );
}

function BlocksCell({
  color,
  progress,
  radius,
  reduceMotion,
  size,
  step,
}: {
  color: string;
  progress: SharedValue<number>;
  radius: number;
  reduceMotion: boolean;
  size: number;
  step: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { transform: [{ scale: 0.8 }] };
    // Same keyframes and stagger as the web version: scale 1 → 0 at 35%,
    // back to 1 at 70%, then hold. Each diagonal starts a step later.
    const t = (progress.value + (STEPS - step) / STEPS) % 1;
    const ease = Easing.bezierFn(0.42, 0, 0.58, 1);
    let scale = 1;
    if (t < 0.35) scale = 1 - ease(t / 0.35);
    else if (t < 0.7) scale = ease((t - 0.35) / 0.35);
    return { transform: [{ scale }] };
  });

  return (
    <Animated.View
      style={[
        {
          backgroundColor: color,
          borderRadius: radius,
          height: size,
          width: size,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
});
