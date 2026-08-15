import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  type ViewProps,
  useWindowDimensions,
} from "react-native";

type BottomDrawerPanelProps = ViewProps & {
  visible?: boolean;
};

export function BottomDrawerPanel({
  style,
  visible = true,
  ...props
}: BottomDrawerPanelProps) {
  const { height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return;
    }

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [progress, visible]);

  return (
    <Animated.View
      {...props}
      style={[
        style,
        {
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [height, 0],
              }),
            },
          ],
        },
      ]}
    />
  );
}
