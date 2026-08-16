import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { NativeMarkdown } from "@/components/native-markdown";
import { ThemedText } from "@/components/themed-text";
import {
  isEditTool,
  type ChatTurn,
} from "@/components/projects/opencode-chat-turns";
import { OpencodeFileDiff } from "@/components/projects/opencode-file-diff";
import { OpencodeToolCall } from "@/components/projects/opencode-tool-call";
import { useTheme } from "@/hooks/use-theme";

export function OpencodeChatTurn({
  item,
  isStreaming,
  isReverting,
  revertDisabled,
  onRevert,
}: {
  item: ChatTurn;
  isStreaming: boolean;
  isReverting: boolean;
  revertDisabled: boolean;
  onRevert: () => void;
}) {
  const theme = useTheme();
  const [copied, setCopied] = useState<"question" | "answer" | null>(null);
  const answer = item.content
    .flatMap((content) => (content.type === "text" ? [content.text] : []))
    .join("\n\n")
    .trim();
  const firstEditGroupId = item.content.find(
    (content) => content.type === "tools" && content.tools.every(isEditTool),
  )?.id;

  const copy = async (kind: "question" | "answer", value: string) => {
    await Clipboard.setStringAsync(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <View style={styles.turn}>
      {item.question || item.images.length > 0 ? (
        <View style={styles.questionGroup}>
          <View
            style={[
              styles.userMessage,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}
          >
            {item.images.length ? (
              <View style={styles.images}>
                {item.images.map((image) => (
                  <Image
                    accessibilityLabel={image.name}
                    contentFit="cover"
                    key={image.id}
                    source={{ uri: image.url }}
                    style={styles.image}
                  />
                ))}
              </View>
            ) : null}
            {item.question ? (
              <ThemedText style={styles.questionText}>
                {item.question}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.turnActions}>
            {item.question ? (
              <IconButton
                label="Copy question"
                name={copied === "question" ? "checkmark" : "doc.on.doc"}
                onPress={() => void copy("question", item.question)}
              />
            ) : null}
            <IconButton
              disabled={revertDisabled || isReverting}
              label="Revert from this question"
              loading={isReverting}
              name="arrow.uturn.backward"
              onPress={onRevert}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.response}>
        {item.content.map((content) => {
          if (content.type === "text") {
            return <NativeMarkdown content={content.text} key={content.id} />;
          }
          if (content.type === "tools") {
            return (
              <OpencodeToolCall
                key={content.id}
                summaryDiffs={
                  content.id === firstEditGroupId
                    ? item.summaryDiffs
                    : undefined
                }
                tools={content.tools}
              />
            );
          }
          if (content.type === "error") {
            return (
              <View
                key={content.id}
                style={[
                  styles.errorCard,
                  {
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239,68,68,0.08)",
                  },
                ]}
              >
                <SymbolView
                  name={{
                    ios: "exclamationmark.circle",
                    android: "error_outline",
                  }}
                  size={18}
                  tintColor="#ef4444"
                />
                <View style={styles.errorBody}>
                  <ThemedText style={styles.errorTitle}>
                    {content.title}
                    {content.statusCode ? ` (${content.statusCode})` : ""}
                  </ThemedText>
                  <ThemedText style={styles.errorMessage}>
                    {content.message}
                  </ThemedText>
                </View>
              </View>
            );
          }
          return isStreaming && content.active ? (
            <View key={content.id} style={styles.thinking}>
              <ActivityIndicator size="small" />
              <ThemedText themeColor="textSecondary">Thinking…</ThemedText>
            </View>
          ) : null;
        })}

        {!firstEditGroupId
          ? item.summaryDiffs.map((diff, index) => (
              <OpencodeFileDiff
                defaultOpen={index === 0}
                diff={diff}
                key={`${diff.file ?? "summary-diff"}-${index}`}
              />
            ))
          : null}

        {answer && !isStreaming ? (
          <View style={styles.metadata}>
            <IconButton
              label="Copy response"
              name={copied === "answer" ? "checkmark" : "doc.on.doc"}
              onPress={() => void copy("answer", answer)}
            />
            {[
              item.agent,
              item.provider,
              item.model,
              formatDuration(item.durationMs),
            ]
              .filter(Boolean)
              .map((value, index) => (
                <ThemedText
                  key={`${value}-${index}`}
                  style={{ color: theme.textSecondary, fontSize: 11 }}
                >
                  {index > 0 ? "· " : ""}
                  {value}
                </ThemedText>
              ))}
          </View>
        ) : null}

        {isStreaming ? (
          <View style={styles.thinking}>
            <ActivityIndicator size="small" />
            <ThemedText themeColor="textSecondary">
              Vibeongo is working…
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function IconButton({
  disabled,
  label,
  loading,
  name,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  name: "arrow.uturn.backward" | "checkmark" | "doc.on.doc";
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <SymbolView
          name={{
            ios: name,
            android:
              name === "arrow.uturn.backward"
                ? "undo"
                : name === "checkmark"
                  ? "check"
                  : "content_copy",
          }}
          size={14}
          tintColor={theme.textSecondary}
        />
      )}
    </Pressable>
  );
}

function formatDuration(durationMs?: number) {
  if (durationMs === undefined) return undefined;
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${Math.round(durationMs / 1000)}s`;
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.35 },
  errorBody: { flex: 1, gap: 3 },
  errorCard: {
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 9,
    padding: 11,
  },
  errorMessage: { fontSize: 12, lineHeight: 18 },
  errorTitle: { fontSize: 13, fontWeight: "700" },
  iconButton: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  image: { borderRadius: 10, height: 112, width: 112 },
  images: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  metadata: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
  },
  pressed: { opacity: 0.65 },
  questionGroup: { alignItems: "flex-end", gap: 2 },
  questionText: { fontSize: 15, lineHeight: 22 },
  response: { gap: 7 },
  thinking: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  turn: { gap: 18 },
  turnActions: { flexDirection: "row" },
  userMessage: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    maxWidth: "88%",
    padding: 10,
  },
});
