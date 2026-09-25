import {
  type Message,
  type Part,
  getOpencodeUserMessage,
} from "@repo/api-client";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

type UserMessage = { info: Message; parts: Part[] };

export function OpencodeForkDrawer({
  messages,
  onClose,
  onSelect,
  visible,
}: {
  messages: UserMessage[];
  onClose: () => void;
  onSelect: (messageId: string) => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const questions = messages.flatMap((message) => {
    if (message.info.role !== "user") return [];
    const text = getOpencodeUserMessage(
      message.parts,
      message.info.role === "user" ? message.info.metadata : undefined,
    ).text;
    return text ? [{ id: message.info.id, text }] : [];
  });

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close fork drawer"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <BottomDrawerPanel
          visible={visible}
          style={[
            styles.drawer,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
          <ThemedText style={styles.title}>Fork through answer</ThemedText>
          <ThemedText
            style={[styles.description, { color: theme.textSecondary }]}
          >
            Choose a question whose answer should be included.
          </ThemedText>
          <ScrollView contentContainerStyle={styles.list}>
            {[...questions].reverse().map((question) => (
              <Pressable
                accessibilityRole="button"
                key={question.id}
                onPress={() => onSelect(question.id)}
                style={({ pressed }) => [
                  styles.item,
                  { borderColor: theme.backgroundSelected },
                  pressed && { backgroundColor: theme.backgroundElement },
                ]}
              >
                <ThemedText numberOfLines={2} style={styles.question}>
                  {question.text}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </BottomDrawerPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,.42)" },
  description: { fontSize: 13, marginTop: 4 },
  drawer: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    maxHeight: "72%",
    padding: 16,
    position: "absolute",
    right: 0,
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 14,
    width: 36,
  },
  item: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 13,
  },
  list: { paddingBottom: 24, paddingTop: 10 },
  question: { fontSize: 14, lineHeight: 20 },
  root: { flex: 1, justifyContent: "flex-end" },
  title: { fontSize: 18, fontWeight: "700" },
});
