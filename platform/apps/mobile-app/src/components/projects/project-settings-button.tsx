import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import { useTheme } from "@/hooks/use-theme";

export function ProjectSettingsButton({
  projectId,
  projectSessionId,
}: {
  projectId: string;
  projectSessionId: string;
}) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel="Project session settings"
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname:
            "/projects/[projectId]/sessions/[projectSessionId]/settings",
          params: { projectId, projectSessionId },
        })
      }
      style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
    >
      <SymbolView
        name={{ ios: "slider.horizontal.3", android: "tune" }}
        size={19}
        tintColor={theme.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  pressed: {
    opacity: 0.7,
  },
});
