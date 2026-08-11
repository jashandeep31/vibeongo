import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { StyleProp, ViewStyle } from "react-native";

type AppIconProps = Pick<SymbolViewProps, "name" | "tintColor" | "weight"> & {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function AppIcon({ size = 20, style, ...props }: AppIconProps) {
  return <SymbolView {...props} size={size} style={style} />;
}
