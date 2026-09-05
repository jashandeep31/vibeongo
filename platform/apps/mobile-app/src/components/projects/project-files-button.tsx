import { type Href, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import { useTheme } from "@/hooks/use-theme";

export function ProjectFilesButton({
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
      accessibilityLabel="Project session files"
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: "/projects/[projectId]/sessions/[projectSessionId]/files",
          params: { projectId, projectSessionId },
        } as unknown as Href)
      }
      style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
    >
      <SymbolView
        name={{ ios: "folder", android: "folder" }}
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
  pressed: { opacity: 0.7 },
});
