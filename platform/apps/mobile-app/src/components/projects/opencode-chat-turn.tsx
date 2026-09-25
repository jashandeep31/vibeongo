import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { NativeMarkdown } from "@/components/native-markdown";
import { ThemedText } from "@/components/themed-text";
import {
  groupConsecutiveToolContent,
  isEditTool,
  type ChatContent,
  type ChatTurn,
  type SnapshotFileDiff,
} from "@/components/projects/opencode-chat-turns";
import { OpencodeFileDiff } from "@/components/projects/opencode-file-diff";
import { OpencodeToolCall } from "@/components/projects/opencode-tool-call";
import { useTheme } from "@/hooks/use-theme";

export const ChatRevertDisabledContext = createContext(false);

function OpencodeChatTurnComponent({
  item,
  isStreaming,
  isReverting,
  onRevert,
  reserveBottomSpace = false,
}: {
  item: ChatTurn;
  isStreaming: boolean;
  isReverting: boolean;
  onRevert: (id: string) => void;
  reserveBottomSpace?: boolean;
}) {
  const theme = useTheme();
  const reservedHeight = useRef(new Animated.Value(0)).current;
  const [copied, setCopied] = useState<"question" | "answer" | null>(null);
  const answer = item.content
    .flatMap((content) => (content.type === "text" ? [content.text] : []))
    .join("\n\n")
    .trim();
  const content = groupConsecutiveToolContent(item.content);
  const firstEditGroupId = content.find(
    (content) => content.type === "tools" && content.tools.every(isEditTool),
  )?.id;

  useEffect(() => {
    const animation = Animated.timing(reservedHeight, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
      toValue: reserveBottomSpace ? Dimensions.get("window").height * 0.6 : 0,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [reserveBottomSpace, reservedHeight]);

  const copy = async (kind: "question" | "answer", value: string) => {
    await Clipboard.setStringAsync(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Animated.View style={[styles.turn, { minHeight: reservedHeight }]}>
      {item.question || item.images.length > 0 || item.files.length > 0 ? (
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
            {item.files.length ? (
              <View style={styles.attachedFiles}>
                {item.files.map((file) => (
                  <View key={file.id} style={styles.attachedFile}>
                    <SymbolView
                      name={{ ios: "doc.text", android: "description" }}
                      size={15}
                      tintColor={theme.textSecondary}
                    />
                    <ThemedText
                      numberOfLines={1}
                      style={styles.attachedFileName}
                    >
                      {file.path.split("/").at(-1) ?? file.path}
                    </ThemedText>
                  </View>
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
            <RevertButton
              id={item.id}
              isReverting={isReverting}
              onRevert={onRevert}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.response}>
        {content.map((content) => {
          return (
            <ChatContentBlock
              content={content}
              isStreaming={isStreaming}
              key={content.id}
              summaryDiffs={
                content.id === firstEditGroupId ? item.summaryDiffs : undefined
              }
            />
          );
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
          <View style={styles.responseFooter}>
            <View style={styles.responseActions}>
              <IconButton
                label="Copy response"
                name={copied === "answer" ? "checkmark" : "doc.on.doc"}
                onPress={() => void copy("answer", answer)}
              />
            </View>
            <View style={styles.metadata}>
              {[item.model, formatDuration(item.durationMs)]
                .filter((value): value is string => Boolean(value))
                .map((value) => (
                  <ThemedText
                    key={value}
                    numberOfLines={1}
                    style={{ color: theme.textSecondary, fontSize: 11 }}
                  >
                    {value}
                  </ThemedText>
                ))}
            </View>
          </View>
        ) : null}

        {isStreaming ? (
          <PulsingStatusText>Vibeongo is working…</PulsingStatusText>
        ) : null}
      </View>
    </Animated.View>
  );
}

// Streaming events replace the session object on every token. Keep completed
// turns off the render path unless their actual display data changed.
export const OpencodeChatTurn = memo(
  OpencodeChatTurnComponent,
  (previous, next) =>
    previous.isStreaming === next.isStreaming &&
    previous.isReverting === next.isReverting &&
    previous.reserveBottomSpace === next.reserveBottomSpace &&
    previous.onRevert === next.onRevert &&
    previous.item === next.item,
);

const ChatContentBlock = memo(
  function ChatContentBlock({
    content,
    isStreaming,
    summaryDiffs,
  }: {
    content: ChatContent;
    isStreaming: boolean;
    summaryDiffs?: SnapshotFileDiff[];
  }) {
    const theme = useTheme();
    if (content.type === "text") {
      return <NativeMarkdown content={content.text} />;
    }
    if (content.type === "reasoning") {
      return <ReasoningBlock content={content} />;
    }
    if (content.type === "notice") {
      return (
        <ThemedText style={[styles.notice, { color: theme.textSecondary }]}>
          {content.text}
        </ThemedText>
      );
    }
    if (content.type === "tools") {
      return (
        <OpencodeToolCall
          isStreaming={isStreaming}
          summaryDiffs={summaryDiffs}
          tools={content.tools}
        />
      );
    }
    if (content.type === "interruption") {
      return (
        <View style={styles.interruption}>
          <View
            style={[
              styles.interruptionLine,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
          <ThemedText style={{ color: theme.textSecondary, fontSize: 11 }}>
            {content.text}
          </ThemedText>
          <View
            style={[
              styles.interruptionLine,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
        </View>
      );
    }
    if (content.type === "error") {
      return (
        <View
          style={[
            styles.errorCard,
            {
              borderColor: "#ef4444",
              backgroundColor: "rgba(239,68,68,0.08)",
            },
          ]}
        >
          <SymbolView
            name={{ ios: "exclamationmark.circle", android: "error_outline" }}
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
    if (content.type === "retry") {
      return (
        <View style={styles.errorCard}>
          <ActivityIndicator size="small" />
          <View style={styles.errorBody}>
            <ThemedText style={styles.errorTitle}>
              Retrying request (attempt {content.attempt})
            </ThemedText>
            <ThemedText style={styles.errorMessage}>
              {content.message}
            </ThemedText>
          </View>
        </View>
      );
    }
    return isStreaming && content.active ? (
      <PulsingStatusText>Thinking…</PulsingStatusText>
    ) : null;
  },
  (previous, next) =>
    previous.content === next.content &&
    previous.summaryDiffs === next.summaryDiffs &&
    (next.content.type !== "thinking" ||
      previous.isStreaming === next.isStreaming),
);

function ReasoningBlock({
  content,
}: {
  content: Extract<ChatContent, { type: "reasoning" }>;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const heading = getReasoningHeading(content.text);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${open ? "Collapse" : "Expand"} reasoning`}
        onPress={() => setOpen((value) => !value)}
        style={styles.reasoningHeader}
      >
        {content.active ? <ActivityIndicator size="small" /> : null}
        <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
          {heading}
        </ThemedText>
        {content.durationMs !== undefined ? (
          <ThemedText style={{ color: theme.textSecondary, fontSize: 11 }}>
            {formatDuration(content.durationMs)}
          </ThemedText>
        ) : null}
      </Pressable>
      {open ? (
        <View
          style={[
            styles.reasoningBody,
            { borderColor: theme.backgroundSelected },
          ]}
        >
          <NativeMarkdown content={content.text} />
        </View>
      ) : null}
    </View>
  );
}

function getReasoningHeading(text: string) {
  const heading = text.match(/^\s{0,3}#{1,6}[ \t]+(.+?)\s*$/m)?.[1];
  const strong = text.match(/^\s*(?:\*\*|__)(.+?)(?:\*\*|__)\s*$/m)?.[1];
  const value = (heading ?? strong ?? "Thought").replace(/[*_~`]+/g, "").trim();
  return value.length > 72 ? `${value.slice(0, 69)}…` : value;
}

function PulsingStatusText({ children }: { children: string }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          toValue: 0.45,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.Text
      style={[styles.thinking, { color: theme.textSecondary, opacity }]}
    >
      {children}
    </Animated.Text>
  );
}

function RevertButton({
  id,
  isReverting,
  onRevert,
}: {
  id: string;
  isReverting: boolean;
  onRevert: (id: string) => void;
}) {
  const globallyDisabled = useContext(ChatRevertDisabledContext);
  return (
    <IconButton
      disabled={globallyDisabled || isReverting}
      label="Revert from this question"
      loading={isReverting}
      name="arrow.uturn.backward"
      onPress={() => onRevert(id)}
    />
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
  attachedFile: { alignItems: "center", flexDirection: "row", gap: 6 },
  attachedFileName: { flexShrink: 1, fontSize: 12 },
  attachedFiles: { gap: 4 },
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
  interruption: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    paddingVertical: 5,
  },
  interruptionLine: { flex: 1, height: StyleSheet.hairlineWidth },
  image: { borderRadius: 10, height: 112, width: 112 },
  images: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  metadata: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginLeft: "auto",
  },
  notice: { fontSize: 13, lineHeight: 20, marginTop: 2 },
  pressed: { opacity: 0.65 },
  reasoningBody: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    marginLeft: 5,
    paddingLeft: 12,
    paddingVertical: 6,
  },
  reasoningHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    paddingVertical: 4,
  },
  questionGroup: { alignItems: "flex-end", gap: 2 },
  questionText: { fontSize: 15, lineHeight: 22 },
  response: { gap: 7 },
  responseActions: { flexDirection: "row" },
  responseFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 5,
  },
  thinking: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
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
