import { BlurTargetView, BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { NativeMarkdown } from "@/components/native-markdown";
import { Radius, Spacing, TouchTarget, type AppColors } from "@/constants/theme";
import { useWebSocket } from "@/contexts/websocket-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import { apiRequest } from "@/lib/api";

import type { Project } from "@/features/home/types";
import { WorkComposer } from "@/features/home/work-composer";

type Chat = {
  id: string;
  name: string;
};

type Mention = {
  id: string;
  name: string;
  type: "project";
};

type ChatAnswer = {
  id: string;
  answer: string;
  reasoning: string | null;
  question_id: string;
};

type ChatTurn = {
  id: string;
  answer: ChatAnswer | null;
  chat_id: string;
  order_number: number;
  payload?: { mentions?: Mention[] } | null;
  question: string;
};

type PersistedChatTurn = Omit<ChatTurn, "answer"> & {
  chatAnswer: ChatAnswer | null;
};

type ChatAnswerDelta = {
  answerDelta: string;
  answerId: string;
  chatId: string;
  questionId: string;
  reasoningDelta: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveQuestionMentions(turn: ChatTurn) {
  const mentions = turn.payload?.mentions ?? [];
  return turn.question.replace(
    /[@$]?\{\{(\d+)\}\}/g,
    (placeholder, rawIndex: string) => {
      const mention = mentions[Number(rawIndex) - 1];
      return mention ? `@${mention.name}` : placeholder;
    },
  );
}

function upsertTurn(turns: ChatTurn[], nextTurn: ChatTurn) {
  const exists = turns.some((turn) => turn.id === nextTurn.id);
  const next = exists
    ? turns.map((turn) => (turn.id === nextTurn.id ? nextTurn : turn))
    : [...turns, nextTurn];
  return next.sort((left, right) => left.order_number - right.order_number);
}

function ReasoningBlock({ reasoning, colors }: { reasoning: string; colors: AppColors }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={[styles.reasoning, { backgroundColor: colors.backgroundElement }]}> 
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={styles.reasoningHeader}
      >
        <AppIcon
          name={{ ios: "brain", android: "psychology", web: "psychology" }}
          size={17}
          tintColor={colors.textSecondary}
        />
        <Text style={[styles.reasoningTitle, { color: colors.textSecondary }]}>Reasoning</Text>
        <AppIcon
          name={
            expanded
              ? { ios: "chevron.up", android: "expand_less", web: "expand_less" }
              : { ios: "chevron.down", android: "expand_more", web: "expand_more" }
          }
          size={16}
          tintColor={colors.textSecondary}
        />
      </Pressable>
      {expanded ? (
        <Text selectable style={[styles.reasoningText, { color: colors.textSecondary }]}>{reasoning}</Text>
      ) : null}
    </View>
  );
}

function ChatTurnView({
  colors,
  isStreaming = false,
  turn,
}: {
  colors: AppColors;
  isStreaming?: boolean;
  turn: ChatTurn;
}) {
  const answer = turn.answer?.answer.trim();
  const reasoning = turn.answer?.reasoning?.trim();

  return (
    <View style={styles.turn}>
      <View style={styles.userMessageRow}>
        <View
          style={[
            styles.userBubble,
            { backgroundColor: colors.backgroundElement, borderColor: colors.border },
          ]}
        >
          <Text selectable style={[styles.userText, { color: colors.text }]}>{resolveQuestionMentions(turn)}</Text>
        </View>
      </View>

      <View style={styles.assistantMessage}>
        <View style={styles.assistantContent}>
          {reasoning ? <ReasoningBlock colors={colors} reasoning={reasoning} /> : null}
          {answer ? (
            <NativeMarkdown colors={colors} content={answer} />
          ) : isStreaming ? (
            <View style={styles.thinkingRow}>
              <ActivityIndicator color={colors.textSecondary} size="small" />
              <Text style={[styles.thinkingText, { color: colors.textSecondary }]}>Thinking…</Text>
            </View>
          ) : (
            <Text style={[styles.thinkingText, { color: colors.textSecondary }]}>No response was saved.</Text>
          )}
        </View>
      </View>
    </View>
  );
}

export function ChatScreen() {
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { isConnected, sendJsonMessage, status, subscribeJsonMessage } = useWebSocket();
  const scrollRef = useRef<ScrollView>(null);
  const blurTargetRef = useRef<View>(null);
  const shouldStickToBottomRef = useRef(true);
  const hasLoadedRef = useRef(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [streamingTurn, setStreamingTurn] = useState<ChatTurn | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToLatest = useCallback((animated = true) => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated }));
    shouldStickToBottomRef.current = true;
    setShowScrollButton(false);
  }, []);

  const joinChat = useCallback(() => {
    if (!chatId || !isConnected) return false;
    return sendJsonMessage({ type: "join-chat", data: { id: chatId } });
  }, [chatId, isConnected, sendJsonMessage]);

  useEffect(() => {
    setChat(null);
    setTurns([]);
    setStreamingTurn(null);
    setIsLoading(true);
    setIsNotFound(false);
    setLoadError(null);
    setIsSending(false);
    hasLoadedRef.current = false;
    shouldStickToBottomRef.current = true;
  }, [chatId]);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Project[]>("/api/v1/projects/with-sessions", {}, controller.signal)
      .then(setProjects)
      .catch(() => setProjects([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeJsonMessage((message) => {
      if (message.type === "chat-data") {
        if (!isRecord(message.data)) {
          setIsLoading(false);
          setLoadError("The server returned an invalid chat response.");
          return;
        }

        const response = message.data as {
          chat?: Chat | null;
          chatQuestions?: PersistedChatTurn[];
        };
        if (!response.chat || response.chat.id !== chatId) {
          setIsLoading(false);
          setIsNotFound(true);
          return;
        }

        const persisted = Array.isArray(response.chatQuestions)
          ? response.chatQuestions.map(({ chatAnswer, ...question }) => ({
              ...question,
              answer: chatAnswer,
            }))
          : [];
        hasLoadedRef.current = true;
        setChat(response.chat);
        setTurns(persisted.sort((left, right) => left.order_number - right.order_number));
        setStreamingTurn(null);
        setIsLoading(false);
        setIsNotFound(false);
        setLoadError(null);
        setIsSending(false);
        scrollToLatest(false);
        return;
      }

      if (message.type === "stream-question-started" && isRecord(message.data)) {
        const turn = message.data as ChatTurn;
        if (turn.chat_id !== chatId) return;
        setStreamingTurn(turn);
        setIsSending(false);
        scrollToLatest();
        return;
      }

      if (message.type === "answer-delta" && isRecord(message.data)) {
        const delta = message.data as ChatAnswerDelta;
        if (delta.chatId !== chatId) return;
        setStreamingTurn((current) => {
          if (
            !current?.answer ||
            current.id !== delta.questionId ||
            current.answer.id !== delta.answerId
          ) {
            return current;
          }
          return {
            ...current,
            answer: {
              ...current.answer,
              answer: current.answer.answer + delta.answerDelta,
              reasoning: (current.answer.reasoning ?? "") + delta.reasoningDelta,
            },
          };
        });
        if (shouldStickToBottomRef.current) scrollToLatest(false);
        return;
      }

      if (message.type === "new-question" && isRecord(message.data)) {
        const turn = message.data as ChatTurn;
        if (turn.chat_id !== chatId) return;
        setTurns((current) => upsertTurn(current, turn));
        setStreamingTurn((current) => (current?.id === turn.id ? null : current));
        setIsSending(false);
        scrollToLatest();
        return;
      }

      if (message.type === "error") {
        const errorMessage =
          isRecord(message.data) && typeof message.data.error === "string"
            ? message.data.error
            : "The chat request failed.";
        setIsSending(false);
        setStreamingTurn(null);
        if (!hasLoadedRef.current) {
          setIsLoading(false);
          setLoadError(errorMessage);
        } else {
          Alert.alert("Chat request failed", errorMessage);
        }
      }
    });

    if (isConnected && !joinChat()) {
      setIsLoading(false);
      setLoadError("Could not connect to the chat server.");
    }
    return unsubscribe;
  }, [chatId, isConnected, joinChat, scrollToLatest, subscribeJsonMessage]);

  const submitQuestion = (payload: {
    message: string;
    tagged: Array<{ type: "project"; data: { id: string; name: string } }>;
  }) => {
    if (!chatId || !isConnected || streamingTurn || isSending) return false;
    const sent = sendJsonMessage({
      type: "new-question",
      data: {
        chatId,
        question: payload.message,
        payload: {
          mentions: payload.tagged.map((tag) => ({
            type: tag.type,
            id: tag.data.id,
            name: tag.data.name,
          })),
        },
      },
    });
    if (!sent) {
      Alert.alert("Chat service is connecting", "Wait a moment and try again.");
      return false;
    }
    setIsSending(true);
    scrollToLatest();
    return true;
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distance = contentSize.height - contentOffset.y - layoutMeasurement.height;
    shouldStickToBottomRef.current = distance <= 120;
    setShowScrollButton(distance > 120);
  };

  if (isLoading) {
    return (
      <ChatStatusScreen
        colors={colors}
        message={status === "connected" ? "Loading chat…" : "Connecting to chat…"}
        onBack={() => router.back()}
      />
    );
  }

  if (isNotFound || loadError || !chat) {
    return (
      <ChatStatusScreen
        colors={colors}
        message={loadError ?? "This chat does not exist or you do not have access to it."}
        onBack={() => router.back()}
        onRetry={
          loadError
            ? () => {
                setIsLoading(true);
                setLoadError(null);
                setIsNotFound(false);
                hasLoadedRef.current = false;
                if (!joinChat()) {
                  setIsLoading(false);
                  setLoadError("Chat service is still connecting.");
                }
              }
            : undefined
        }
        title={loadError ? "Could not load chat" : "Chat not found"}
      />
    );
  }

  const isStreaming = streamingTurn !== null;
  const placeholder = !isConnected
    ? "Reconnecting…"
    : isStreaming
      ? "Wait for the response…"
      : "Ask a follow-up question";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          enabled
          keyboardVerticalOffset={0}
          style={styles.keyboardView}
        >
          <BlurTargetView ref={blurTargetRef} style={styles.blurTarget}>
            <View style={styles.conversationArea}>
              <ScrollView
                contentContainerStyle={styles.messages}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => {
                  if (shouldStickToBottomRef.current) scrollToLatest(false);
                }}
                onScroll={handleScroll}
                ref={scrollRef}
                scrollEventThrottle={32}
                showsVerticalScrollIndicator={false}
              >
                {turns.map((turn) => (
                  <ChatTurnView colors={colors} key={turn.id} turn={turn} />
                ))}
                {streamingTurn ? (
                  <ChatTurnView colors={colors} isStreaming turn={streamingTurn} />
                ) : null}
              </ScrollView>

              {showScrollButton ? (
                <Pressable
                  accessibilityLabel="Scroll to latest message"
                  accessibilityRole="button"
                  onPress={() => scrollToLatest()}
                  style={[styles.scrollButton, { backgroundColor: colors.primary }]}
                >
                  <AppIcon
                    name={{ ios: "arrow.down", android: "arrow_downward", web: "arrow_downward" }}
                    size={18}
                    tintColor={colors.primaryForeground}
                  />
                </Pressable>
              ) : null}
            </View>

            <View style={[styles.composerArea, { backgroundColor: colors.background }]}> 
              <WorkComposer
                colors={colors}
                compact
                isConnected={isConnected}
                isSubmitting={isSending || isStreaming}
                onSubmit={submitQuestion}
                placeholder={placeholder}
                projects={projects}
                showConnectionStatus={false}
                showHeading={false}
              />
            </View>
          </BlurTargetView>

          <View pointerEvents="box-none" style={styles.floatingHeader}>
            <BlurView
              blurMethod="dimezisBlurViewSdk31Plus"
              blurTarget={blurTargetRef}
              intensity={72}
              style={[styles.floatingBack, { borderColor: colors.border }]}
              tint={colorScheme === "dark" ? "systemThinMaterialDark" : "systemThinMaterialLight"}
            >
              <Pressable
                accessibilityLabel="Back to home"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => router.back()}
                style={styles.floatingBackPressable}
              >
                <AppIcon
                  name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
                  size={20}
                  tintColor={colors.text}
                />
              </Pressable>
            </BlurView>

            <BlurView
              blurMethod="dimezisBlurViewSdk31Plus"
              blurTarget={blurTargetRef}
              intensity={72}
              style={[styles.titlePill, { borderColor: colors.border }]}
              tint={colorScheme === "dark" ? "systemThinMaterialDark" : "systemThinMaterialLight"}
            >
              <Text numberOfLines={1} style={[styles.floatingTitle, { color: colors.text }]}>
                {chat.name}
              </Text>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function ChatStatusScreen({
  colors,
  message,
  onBack,
  onRetry,
  title,
}: {
  colors: AppColors;
  message: string;
  onBack: () => void;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}> 
      <Pressable
        accessibilityLabel="Back to home"
        accessibilityRole="button"
        onPress={onBack}
        style={[styles.statusBackButton, { backgroundColor: colors.backgroundElement }]}
      >
        <AppIcon
          name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
          size={20}
          tintColor={colors.text}
        />
      </Pressable>
      <View style={styles.statusContent}>
        {title ? (
          <View style={[styles.statusIcon, { backgroundColor: colors.backgroundElement }]}> 
            <AppIcon
              name={{ ios: "bubble.left", android: "chat_bubble", web: "chat_bubble" }}
              size={24}
              tintColor={colors.textSecondary}
            />
          </View>
        ) : (
          <ActivityIndicator color={colors.brand} size="large" />
        )}
        {title ? <Text style={[styles.statusTitle, { color: colors.text }]}>{title}</Text> : null}
        <Text style={[styles.statusMessage, { color: colors.textSecondary }]}>{message}</Text>
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
          >
            <AppIcon
              name={{ ios: "arrow.clockwise", android: "refresh", web: "refresh" }}
              size={17}
              tintColor={colors.primaryForeground}
            />
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  blurTarget: { flex: 1 },
  floatingHeader: {
    alignItems: "center",
    left: Spacing.four,
    position: "absolute",
    right: Spacing.four,
    top: Spacing.two,
  },
  floatingBack: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 5,
    height: TouchTarget,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    width: TouchTarget,
  },
  floatingBackPressable: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  titlePill: {
    alignItems: "center",
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    height: 40,
    justifyContent: "center",
    maxWidth: "68%",
    overflow: "hidden",
    paddingHorizontal: Spacing.four,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  floatingTitle: { fontSize: 14, fontWeight: "700", maxWidth: "100%" },
  conversationArea: { flex: 1 },
  messages: {
    alignSelf: "center",
    gap: Spacing.eight,
    maxWidth: 760,
    paddingBottom: Spacing.eight,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.ten,
    width: "100%",
  },
  turn: { gap: Spacing.six },
  userMessageRow: { alignItems: "flex-end" },
  userBubble: {
    borderRadius: Radius.large,
    borderTopRightRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "88%",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  userText: { fontSize: 15, lineHeight: 22 },
  assistantMessage: { width: "100%" },
  assistantContent: { minWidth: 0, width: "100%" },
  answerText: { fontSize: 15, lineHeight: 24 },
  reasoning: { borderRadius: Radius.medium, marginBottom: Spacing.four, overflow: "hidden" },
  reasoningHeader: { alignItems: "center", flexDirection: "row", gap: Spacing.two, minHeight: TouchTarget, paddingHorizontal: Spacing.three },
  reasoningTitle: { flex: 1, fontSize: 12, fontWeight: "700" },
  reasoningText: { fontSize: 12, lineHeight: 19, paddingBottom: Spacing.four, paddingHorizontal: Spacing.four },
  thinkingRow: { alignItems: "center", flexDirection: "row", gap: Spacing.two, minHeight: 28 },
  thinkingText: { fontSize: 13 },
  scrollButton: {
    alignItems: "center",
    borderRadius: Radius.pill,
    bottom: Spacing.four,
    elevation: 5,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: Spacing.five,
    width: 42,
  },
  composerArea: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  statusBackButton: {
    alignItems: "center",
    borderRadius: Radius.medium,
    height: TouchTarget,
    justifyContent: "center",
    marginLeft: Spacing.five,
    marginTop: Spacing.two,
    width: TouchTarget,
  },
  statusContent: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: Spacing.seven },
  statusIcon: { alignItems: "center", borderRadius: Radius.large, height: 56, justifyContent: "center", marginBottom: Spacing.four, width: 56 },
  statusTitle: { fontSize: 18, fontWeight: "700", marginBottom: Spacing.two, textAlign: "center" },
  statusMessage: { fontSize: 13, lineHeight: 20, marginTop: Spacing.three, maxWidth: 320, textAlign: "center" },
  retryButton: { alignItems: "center", borderRadius: Radius.pill, flexDirection: "row", gap: 7, height: TouchTarget, marginTop: Spacing.five, paddingHorizontal: Spacing.five },
  retryText: { fontSize: 13, fontWeight: "700" },
});
