import type { OpencodePromptSelection, QuestionAnswer } from "@repo/api-client";
import {
  useAbortOpencodeSession,
  useAnswerOpencodeQuestion,
  useOpencodeInventory,
  useOpencodeSession,
  useRejectOpencodeQuestion,
  useRestoreRevertedOpencodeMessage,
  useRevertOpencodeSession,
  useSendOpencodePrompt,
} from "@repo/api-hooks";
import { useSessionChatsStore } from "@repo/app-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  AppState,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createChatTurns,
  getRevertedMessageLabel,
  getSessionPromptSelection,
} from "@/components/projects/opencode-chat-turns";
import { OpencodeChatTurn } from "@/components/projects/opencode-chat-turn";
import {
  OpencodeComposer,
  type ComposerImageAttachment,
} from "@/components/projects/opencode-composer";
import { OpencodeQuestionPrompt } from "@/components/projects/opencode-question-prompt";
import { ProjectChatStatus } from "@/components/projects/project-chat-status";
import {
  ProjectChatSwitcherDrawer,
  type ProjectChatTarget,
} from "@/components/projects/project-chat-switcher-drawer";
import { ProjectDomainsButton } from "@/components/projects/project-domains-drawer";
import { ThemedText } from "@/components/themed-text";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";

const EMPTY_SESSION_CHATS: Array<{ id: string }> = [];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function ProjectChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const chatTransitionX = useRef(new Animated.Value(0)).current;
  const isChatTransitioningRef = useRef(false);
  const params = useLocalSearchParams<{
    opencodeSessionId?: string | string[];
    projectId?: string | string[];
    projectSessionId?: string | string[];
  }>();
  const projectSessionId = firstParam(params.projectSessionId);
  const projectId = firstParam(params.projectId);
  const opencodeSessionId = firstParam(params.opencodeSessionId);
  const storedSessionChats = useSessionChatsStore(
    (store) => store.chatsBySessionId[projectSessionId],
  );
  const sessionChats = storedSessionChats ?? EMPTY_SESSION_CHATS;
  const runtime = useProjectRuntime(projectSessionId);
  const sessionQuery = useOpencodeSession({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl: runtime.serverUrl,
    accessToken: runtime.accessToken,
    password: runtime.password,
  });
  const sendPrompt = useSendOpencodePrompt({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl: runtime.serverUrl,
    accessToken: runtime.accessToken,
    password: runtime.password,
  });
  const abortSession = useAbortOpencodeSession({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl: runtime.serverUrl,
    accessToken: runtime.accessToken,
    password: runtime.password,
  });
  const answerQuestion = useAnswerOpencodeQuestion({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl: runtime.serverUrl,
    accessToken: runtime.accessToken,
    password: runtime.password,
  });
  const rejectQuestion = useRejectOpencodeQuestion({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl: runtime.serverUrl,
    accessToken: runtime.accessToken,
    password: runtime.password,
  });
  const revertSession = useRevertOpencodeSession({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl: runtime.serverUrl,
    accessToken: runtime.accessToken,
    password: runtime.password,
  });
  const restoreMessage = useRestoreRevertedOpencodeMessage({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl: runtime.serverUrl,
    accessToken: runtime.accessToken,
    password: runtime.password,
  });
  const inventoryQuery = useOpencodeInventory(
    projectSessionId,
    runtime.serverUrl,
    runtime.accessToken,
    runtime.password,
  );
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<ComposerImageAttachment[]>([]);
  const [isChatSwitcherOpen, setIsChatSwitcherOpen] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const data = sessionQuery.data;
  const [selection, setSelection] = useState<OpencodePromptSelection>({});
  const sessionSelection = useMemo(
    () => getSessionPromptSelection(data),
    [data],
  );
  const { visibleMessages, revertedMessages } = useMemo(() => {
    const messages = data?.messages ?? [];
    const revertMessageId = data?.session.revert?.messageID;
    if (!revertMessageId) {
      return { visibleMessages: messages, revertedMessages: [] };
    }
    const revertIndex = messages.findIndex(
      (message) => message.info.id === revertMessageId,
    );
    return revertIndex === -1
      ? { visibleMessages: messages, revertedMessages: [] }
      : {
          visibleMessages: messages.slice(0, revertIndex),
          revertedMessages: messages.slice(revertIndex),
        };
  }, [data?.messages, data?.session.revert?.messageID]);
  const turns = useMemo(
    () => createChatTurns(visibleMessages),
    [visibleMessages],
  );
  const revertedQuestions = useMemo(
    () =>
      revertedMessages
        .filter((message) => message.info.role === "user")
        .map((message) => ({
          id: message.info.id,
          label: getRevertedMessageLabel(message.parts),
        })),
    [revertedMessages],
  );
  const activeQuestion = data?.questions[0];

  useEffect(() => {
    setSelection(sessionSelection);
  }, [
    opencodeSessionId,
    sessionSelection.agent,
    sessionSelection.model,
    sessionSelection.variant,
  ]);

  useEffect(() => {
    const inventory = inventoryQuery.data;
    if (!inventory) return;
    setSelection((current) => ({
      ...current,
      model:
        current.model &&
        inventory.models.some((model) => model.id === current.model)
          ? current.model
          : (inventory.defaultSelection.model ?? inventory.models[0]?.id),
      agent:
        current.agent &&
        inventory.agents.some((agent) => agent.id === current.agent)
          ? current.agent
          : (inventory.defaultSelection.agent ??
            inventory.agents.find((agent) => agent.mode === "primary")?.id ??
            inventory.agents[0]?.id),
    }));
  }, [inventoryQuery.data]);

  const goBack = () => router.replace("/");

  const openNewChat = () => {
    router.push({
      pathname: "/projects/[projectId]/sessions/[projectSessionId]/new-chat",
      params: {
        directory: data?.session.directory ?? "",
        ...(selection.agent ? { agent: selection.agent } : {}),
        ...(selection.model ? { model: selection.model } : {}),
        ...(selection.variant ? { variant: selection.variant } : {}),
        projectId,
        projectSessionId,
      },
    });
  };

  const selectChat = (target: ProjectChatTarget) => {
    setIsChatSwitcherOpen(false);
    if (
      target.projectId === projectId &&
      target.projectSessionId === projectSessionId
    ) {
      if (target.opencodeSessionId !== opencodeSessionId) {
        setAttachments([]);
        router.setParams({ opencodeSessionId: target.opencodeSessionId });
      }
      return;
    }

    router.replace({
      pathname:
        "/projects/[projectId]/sessions/[projectSessionId]/chats/[opencodeSessionId]",
      params: target,
    });
  };

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setIsKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setIsKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const switchRelativeChat = useCallback(
    (offset: -1 | 1) => {
      if (sessionChats.length < 2 || isChatTransitioningRef.current) return;
      const currentIndex = sessionChats.findIndex(
        (chat) => chat.id === opencodeSessionId,
      );
      const baseIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextChat =
        sessionChats[
          (baseIndex + offset + sessionChats.length) % sessionChats.length
        ];
      if (!nextChat) return;

      isChatTransitioningRef.current = true;
      const exitX = offset === 1 ? -88 : 88;
      chatTransitionX.stopAnimation();
      Animated.timing(chatTransitionX, {
        duration: 125,
        easing: Easing.in(Easing.cubic),
        toValue: exitX,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          isChatTransitioningRef.current = false;
          return;
        }

        router.replace({
          pathname:
            "/projects/[projectId]/sessions/[projectSessionId]/chats/[opencodeSessionId]",
          params: {
            opencodeSessionId: nextChat.id,
            projectId,
            projectSessionId,
          },
        });
        chatTransitionX.setValue(-exitX * 0.7);
        requestAnimationFrame(() =>
          Animated.spring(chatTransitionX, {
            damping: 19,
            mass: 0.75,
            stiffness: 220,
            toValue: 0,
            useNativeDriver: true,
          }).start(() => {
            isChatTransitioningRef.current = false;
          }),
        );
      });
    },
    [
      chatTransitionX,
      opencodeSessionId,
      projectId,
      projectSessionId,
      router,
      sessionChats,
    ],
  );

  const pageSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          !isKeyboardVisible &&
          sessionChats.length > 1 &&
          !isChatTransitioningRef.current &&
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isKeyboardVisible &&
          sessionChats.length > 1 &&
          !isChatTransitioningRef.current &&
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15,
        onPanResponderGrant: () => chatTransitionX.stopAnimation(),
        onPanResponderMove: (_, gesture) =>
          chatTransitionX.setValue(
            Math.max(-64, Math.min(64, gesture.dx * 0.5)),
          ),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -42) switchRelativeChat(1);
          else if (gesture.dx > 42) switchRelativeChat(-1);
          else
            Animated.spring(chatTransitionX, {
              damping: 18,
              stiffness: 220,
              toValue: 0,
              useNativeDriver: true,
            }).start();
        },
        onPanResponderTerminate: () =>
          Animated.spring(chatTransitionX, {
            damping: 18,
            stiffness: 220,
            toValue: 0,
            useNativeDriver: true,
          }).start(),
        onShouldBlockNativeResponder: () => true,
      }),
    [
      chatTransitionX,
      isKeyboardVisible,
      sessionChats.length,
      switchRelativeChat,
    ],
  );

  useEffect(() => {
    useSessionChatsStore
      .getState()
      .setChatUnread(projectSessionId, opencodeSessionId, false);
  }, [opencodeSessionId, projectSessionId]);

  useEffect(() => {
    if (!data) return;
    const store = useSessionChatsStore.getState();
    store.upsertSessionChat(projectSessionId, data.session);
    store.setChatMessages(projectSessionId, opencodeSessionId, data.messages);
    store.setChatStatus(projectSessionId, opencodeSessionId, data.status);
    store.setChatAttention(
      projectSessionId,
      opencodeSessionId,
      data.questions.length > 0,
    );
  }, [data, opencodeSessionId, projectSessionId]);

  useEffect(() => {
    if (!sessionQuery.isStreaming) return;
    const interval = setInterval(() => void sessionQuery.resync(), 1_000);
    return () => clearInterval(interval);
  }, [sessionQuery.isStreaming, sessionQuery.resync]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void sessionQuery.resync();
    });
    return () => subscription.remove();
  }, [sessionQuery.resync]);

  useEffect(() => {
    if (!data) return;
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd());
  }, [data?.messages.length, data?.questions.length, sessionQuery.isStreaming]);

  const submit = () => {
    const text = prompt.trim();
    if (
      (!text && attachments.length === 0) ||
      sendPrompt.isPending ||
      sessionQuery.isStreaming
    )
      return;
    const submittedAttachments = attachments;
    setPrompt("");
    setAttachments([]);
    sendPrompt.mutate(
      { text, files: [], attachments: submittedAttachments, selection },
      {
        onError: () => {
          setPrompt(text);
          setAttachments(submittedAttachments);
        },
        onSuccess: () => void sessionQuery.resync(),
      },
    );
  };

  const submitQuestionAnswer = (
    requestId: string,
    answers: QuestionAnswer[],
  ) => {
    answerQuestion.mutate(
      { requestId, answers },
      {
        onError: (error) =>
          Alert.alert("Could not submit your answer", error.message),
        onSuccess: () =>
          requestAnimationFrame(() =>
            scrollRef.current?.scrollToEnd({ animated: true }),
          ),
      },
    );
  };

  const dismissQuestion = (requestId: string) => {
    rejectQuestion.mutate(requestId, {
      onError: (error) =>
        Alert.alert("Could not dismiss the question", error.message),
    });
  };

  if (runtime.isPending) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (runtime.isError || !runtime.instance) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: theme.background }]}
      >
        <ProjectChatStatus
          description="This project session is no longer running or its connection expired."
          onBack={goBack}
          title="OpenCode server unavailable"
        />
      </SafeAreaView>
    );
  }

  if (sessionQuery.isPending) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (sessionQuery.error || !data) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: theme.background }]}
      >
        <ProjectChatStatus
          description={
            sessionQuery.error?.message ?? "OpenCode returned no chat data."
          }
          onBack={goBack}
          title="Could not load chat"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled
        style={styles.screen}
      >
        <Animated.View
          style={[
            styles.screen,
            {
              opacity: chatTransitionX.interpolate({
                inputRange: [-88, 0, 88],
                outputRange: [0.35, 1, 0.35],
              }),
              transform: [{ translateX: chatTransitionX }],
            },
          ]}
          {...pageSwipeResponder.panHandlers}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={goBack}
              style={({ pressed }) => [
                styles.headerButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{ ios: "chevron.left", android: "arrow_back" }}
                size={18}
                tintColor={theme.text}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Switch chat"
              accessibilityRole="button"
              onPress={() => setIsChatSwitcherOpen(true)}
              style={[
                styles.headerTitlePill,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <ThemedText numberOfLines={1} style={styles.headerTitle}>
                {data.session.title || "Untitled chat"}
              </ThemedText>
              <SymbolView
                name={{ ios: "chevron.down", android: "keyboard_arrow_down" }}
                size={13}
                tintColor={theme.textSecondary}
              />
            </Pressable>
            <View
              style={[
                styles.headerActions,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <ProjectDomainsButton
                instanceId={runtime.instance.id}
                projectId={projectId}
              />
              <Pressable
                accessibilityLabel="Reload chat"
                accessibilityRole="button"
                disabled={sessionQuery.isFetching}
                onPress={() => void sessionQuery.resync()}
                style={({ pressed }) => [
                  styles.headerAction,
                  pressed && styles.pressed,
                ]}
              >
                {sessionQuery.isFetching ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <SymbolView
                    name={{ ios: "arrow.clockwise", android: "refresh" }}
                    size={19}
                    tintColor={theme.textSecondary}
                  />
                )}
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.messages}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              if (sessionQuery.isStreaming) {
                scrollRef.current?.scrollToEnd({ animated: true });
              }
            }}
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
          >
            {showRawResponse ? (
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <ThemedText selectable style={styles.rawResponse}>
                  {JSON.stringify(data, null, 2)}
                </ThemedText>
              </ScrollView>
            ) : null}
            {!showRawResponse &&
              turns.map((turn, index) => (
                <OpencodeChatTurn
                  isReverting={
                    revertSession.isPending &&
                    revertSession.variables === turn.id
                  }
                  isStreaming={
                    sessionQuery.isStreaming && index === turns.length - 1
                  }
                  item={turn}
                  key={turn.id}
                  onRevert={() =>
                    revertSession.mutate(turn.id, {
                      onError: (error) =>
                        Alert.alert("Could not revert messages", error.message),
                    })
                  }
                  revertDisabled={
                    sessionQuery.isStreaming ||
                    revertSession.isPending ||
                    restoreMessage.isPending
                  }
                />
              ))}
            {!showRawResponse &&
            turns.length === 0 &&
            !activeQuestion &&
            !sessionQuery.isStreaming ? (
              <ThemedText
                style={[styles.emptyText, { color: theme.textSecondary }]}
              >
                Start the chat by describing what you want to build.
              </ThemedText>
            ) : null}
            {!showRawResponse &&
            sessionQuery.isStreaming &&
            turns.length === 0 ? (
              <View style={styles.thinking}>
                <ActivityIndicator size="small" />
                <ThemedText themeColor="textSecondary">
                  Vibeongo is working…
                </ThemedText>
              </View>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.composerOuter,
              { backgroundColor: theme.background },
            ]}
          >
            {!showRawResponse && revertedQuestions.length > 0 ? (
              <RevertedMessagesPanel
                messages={revertedQuestions}
                onRestore={(messageId, nextMessageId) =>
                  restoreMessage.mutate(
                    { messageId, nextMessageId },
                    {
                      onError: (error) =>
                        Alert.alert("Could not restore message", error.message),
                    },
                  )
                }
                restoreDisabled={
                  sessionQuery.isStreaming || revertSession.isPending
                }
                restoringMessageId={restoreMessage.variables?.messageId}
              />
            ) : null}
            {activeQuestion ? (
              <OpencodeQuestionPrompt
                isDismissing={rejectQuestion.isPending}
                isSubmitting={answerQuestion.isPending}
                key={activeQuestion.id}
                onDismiss={dismissQuestion}
                onSubmit={submitQuestionAnswer}
                request={activeQuestion}
              />
            ) : (
              <OpencodeComposer
                accessibilityLabel="Follow-up prompt"
                attachments={attachments}
                inventory={inventoryQuery.data}
                isStopping={abortSession.isPending}
                isSubmitting={sendPrompt.isPending}
                onChangeSelection={setSelection}
                onChangeAttachments={setAttachments}
                onChangeText={setPrompt}
                onNewChat={openNewChat}
                onToggleRaw={() => setShowRawResponse((visible) => !visible)}
                onStop={
                  sessionQuery.isStreaming
                    ? () =>
                        abortSession.mutate(undefined, {
                          onError: (error) =>
                            Alert.alert(
                              "Could not stop OpenCode",
                              error.message,
                            ),
                        })
                    : undefined
                }
                onSubmit={submit}
                placeholder={
                  sessionQuery.isStreaming
                    ? "Write your next message…"
                    : "Ask a follow-up…"
                }
                selection={selection}
                showRawResponse={showRawResponse}
                submitDisabled={sessionQuery.isStreaming}
                value={prompt}
              />
            )}
            {sendPrompt.error ? (
              <ThemedText style={styles.error}>
                {sendPrompt.error.message}
              </ThemedText>
            ) : null}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
      <ProjectChatSwitcherDrawer
        current={{ opencodeSessionId, projectId, projectSessionId }}
        onClose={() => setIsChatSwitcherOpen(false)}
        onNewChat={(target) => {
          setIsChatSwitcherOpen(false);
          router.push({
            pathname:
              "/projects/[projectId]/sessions/[projectSessionId]/new-chat",
            params: {
              ...target,
              ...(target.projectSessionId === projectSessionId &&
              selection.agent
                ? { agent: selection.agent }
                : {}),
              ...(target.projectSessionId === projectSessionId &&
              selection.model
                ? { model: selection.model }
                : {}),
              ...(target.projectSessionId === projectSessionId &&
              selection.variant
                ? { variant: selection.variant }
                : {}),
            },
          });
        }}
        onSelect={selectChat}
        visible={isChatSwitcherOpen}
      />
    </SafeAreaView>
  );
}

function RevertedMessagesPanel({
  messages,
  restoringMessageId,
  restoreDisabled,
  onRestore,
}: {
  messages: Array<{ id: string; label: string }>;
  restoringMessageId?: string;
  restoreDisabled: boolean;
  onRestore: (messageId: string, nextMessageId?: string) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  return (
    <View
      style={[
        styles.revertedPanel,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [
          styles.revertedHeader,
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{ ios: "arrow.uturn.backward", android: "undo" }}
          size={15}
          tintColor={theme.textSecondary}
        />
        <ThemedText style={styles.revertedTitle}>
          {messages.length} rolled back message
          {messages.length === 1 ? "" : "s"}
        </ThemedText>
        <SymbolView
          name={{
            ios: open ? "chevron.down" : "chevron.right",
            android: open ? "expand_more" : "chevron_right",
          }}
          size={14}
          tintColor={theme.textSecondary}
        />
      </Pressable>
      {open ? (
        <ScrollView style={styles.revertedList}>
          {messages.map((message, index) => (
            <View key={message.id} style={styles.revertedRow}>
              <ThemedText
                numberOfLines={1}
                style={[styles.revertedLabel, { color: theme.textSecondary }]}
              >
                {message.label}
              </ThemedText>
              <Pressable
                accessibilityLabel={`Restore ${message.label}`}
                accessibilityRole="button"
                disabled={restoreDisabled || restoringMessageId !== undefined}
                onPress={() => onRestore(message.id, messages[index + 1]?.id)}
                style={({ pressed }) => [
                  styles.restoreButton,
                  { borderColor: theme.backgroundSelected },
                  (restoreDisabled || restoringMessageId !== undefined) &&
                    styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {restoringMessageId === message.id ? (
                  <ActivityIndicator size="small" />
                ) : null}
                <ThemedText style={styles.restoreText}>Restore</ThemedText>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  composerOuter: {
    gap: 6,
    paddingBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  error: {
    color: "#ef4444",
    fontSize: 12,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 120,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerAction: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  headerActions: {
    alignItems: "center",
    borderRadius: 24,
    flexDirection: "row",
    height: 44,
    overflow: "hidden",
  },
  headerButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerTitlePill: {
    alignItems: "center",
    borderRadius: 22,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    height: 42,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    maxWidth: "100%",
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  messages: {
    gap: 28,
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 24,
  },
  rawResponse: {
    fontFamily: Platform.select({ ios: "ui-monospace", default: "monospace" }),
    fontSize: 11,
    lineHeight: 17,
    minWidth: 500,
  },
  restoreButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  restoreText: {
    fontSize: 12,
    fontWeight: "700",
  },
  revertedHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  revertedLabel: {
    flex: 1,
    fontSize: 12,
  },
  revertedList: {
    maxHeight: 150,
    paddingHorizontal: 10,
  },
  revertedPanel: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  revertedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingBottom: 8,
  },
  revertedTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.72,
  },
  screen: {
    flex: 1,
  },
  thinking: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  disabled: { opacity: 0.4 },
});
