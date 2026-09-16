import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import { useTheme } from "@/hooks/use-theme";

export function ProjectMcpButton({
  disabled = false,
  onPress,
}: {
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel="MCP servers"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{ ios: "server.rack", android: "dns" }}
        size={19}
        tintColor={theme.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.62 },
});
