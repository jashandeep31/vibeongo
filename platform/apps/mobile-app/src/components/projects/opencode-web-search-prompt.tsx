import type { WebSearchProvider, WebSearchRequest } from "@repo/api-client";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export function OpencodeWebSearchPrompt({
  isLoading,
  isSubmitting,
  onReply,
  providers,
  request,
}: {
  isLoading: boolean;
  isSubmitting: boolean;
  onReply: (selection: string | false) => void;
  providers?: WebSearchProvider[];
  request: WebSearchRequest;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const options: Array<{ label: string; value: string; description?: string }> =
    request.options.length
      ? request.options
      : (providers ?? []).map((provider) => ({
          label: provider.name,
          value: provider.id,
        }));
  return (
    <Modal animationType="none" transparent statusBarTranslucent visible>
      <View style={styles.backdrop} />
      <BottomDrawerPanel
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
            marginBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <View style={styles.handle} />
        <ThemedText style={styles.eyebrow}>Web search</ThemedText>
        <ThemedText style={styles.title}>
          {request.title || "Choose a web-search provider"}
        </ThemedText>
        <ScrollView contentContainerStyle={styles.options}>
          {isLoading ? (
            <ActivityIndicator />
          ) : (
            options.map((option) => (
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                key={option.value}
                onPress={() => onReply(option.value)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderColor: theme.backgroundSelected,
                    opacity: pressed || isSubmitting ? 0.7 : 1,
                  },
                ]}
              >
                <ThemedText style={{ fontWeight: "700" }}>
                  {option.label}
                </ThemedText>
                {option.description ? (
                  <ThemedText
                    style={{ color: theme.textSecondary, fontSize: 12 }}
                  >
                    {option.description}
                  </ThemedText>
                ) : null}
              </Pressable>
            ))
          )}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => onReply(false)}
          style={[styles.disable, { borderColor: theme.backgroundSelected }]}
        >
          <ThemedText style={{ color: theme.textSecondary }}>
            Disable web search
          </ThemedText>
        </Pressable>
      </BottomDrawerPanel>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,.42)" },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    gap: 10,
    left: 8,
    maxHeight: "72%",
    padding: 18,
    position: "absolute",
    right: 8,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "#888",
    borderRadius: 2,
    height: 4,
    marginBottom: 4,
    width: 36,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.7,
    textTransform: "uppercase",
  },
  title: { fontSize: 18, fontWeight: "800" },
  options: { gap: 8 },
  option: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 3,
    padding: 12,
  },
  disable: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 42,
    justifyContent: "center",
  },
});
