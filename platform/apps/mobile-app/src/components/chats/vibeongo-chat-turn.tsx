import type { ChatAnswer, ChatQuestion, ChatTurn } from "@repo/app-store";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { NativeMarkdown } from "@/components/native-markdown";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

function resolveQuestionMentions(question: ChatQuestion) {
  const mentions = question.payload?.mentions ?? [];
  return question.question.replace(
    /[@$]?\{\{(\d+)\}\}/g,
    (placeholder, rawIndex: string) => {
      const mention = mentions[Number(rawIndex) - 1];
      return mention ? `@${mention.name}` : placeholder;
    },
  );
}

function ChatResponse({
  answer,
  isStreaming,
}: {
  answer: ChatAnswer | null;
  isStreaming: boolean;
}) {
  const theme = useTheme();
  const [showReasoning, setShowReasoning] = useState(false);
  const reasoning = answer?.reasoning?.trim();
  const response = answer?.answer.trim();

  return (
    <View style={styles.response}>
      {reasoning ? (
        <View
          style={[
            styles.reasoning,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showReasoning }}
            onPress={() => setShowReasoning((visible) => !visible)}
            style={({ pressed }) => [
              styles.reasoningHeader,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{
                ios: showReasoning ? "chevron.down" : "chevron.right",
                android: showReasoning
                  ? "keyboard_arrow_down"
                  : "chevron_right",
              }}
              size={16}
              tintColor={theme.textSecondary}
            />
            <ThemedText
              style={styles.reasoningTitle}
              themeColor="textSecondary"
            >
              Reasoning
            </ThemedText>
          </Pressable>
          {showReasoning ? (
            <ThemedText
              selectable
              style={styles.reasoningText}
              themeColor="textSecondary"
            >
              {reasoning}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {response ? <NativeMarkdown content={response} /> : null}

      {isStreaming && !response ? (
        <View accessibilityLiveRegion="polite" style={styles.thinking}>
          <ActivityIndicator size="small" />
          <ThemedText style={styles.thinkingText} themeColor="textSecondary">
            Thinking…
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export function VibeongoChatTurn({
  isStreaming = false,
  turn,
}: {
  isStreaming?: boolean;
  turn: ChatTurn;
}) {
  const theme = useTheme();

  return (
    <View style={styles.turn}>
      <View style={styles.questionWrap}>
        <View
          style={[
            styles.question,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          <ThemedText selectable style={styles.questionText}>
            {resolveQuestionMentions(turn)}
          </ThemedText>
        </View>
      </View>
      <ChatResponse answer={turn.answer} isStreaming={isStreaming} />
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.72,
  },
  question: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "88%",
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  questionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  questionWrap: {
    alignItems: "flex-end",
  },
  reasoning: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reasoningHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    minHeight: 28,
  },
  reasoningText: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  reasoningTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  response: {
    minHeight: 20,
  },
  thinking: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 8,
  },
  thinkingText: {
    fontSize: 14,
  },
  turn: {
    gap: 22,
    paddingBottom: 34,
  },
});
