import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export function ProjectChatStatus({
  description,
  onBack,
  title,
}: {
  description: string;
  onBack: () => void;
  title: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <View style={[styles.icon, { backgroundColor: theme.backgroundElement }]}>
        <SymbolView
          name={{ ios: "exclamationmark.triangle", android: "warning" }}
          size={20}
          tintColor={theme.textSecondary}
        />
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.description} themeColor="textSecondary">
        {description}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.buttonLabel}>Back to projects</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  description: {
    lineHeight: 21,
    maxWidth: 340,
    textAlign: "center",
  },
  icon: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    marginBottom: 4,
    width: 44,
  },
  pressed: {
    opacity: 0.72,
  },
  root: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
});
