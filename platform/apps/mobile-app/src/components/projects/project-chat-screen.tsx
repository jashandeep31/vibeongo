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
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

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
import { ProjectSettingsButton } from "@/components/projects/project-settings-button";
import { ThemedText } from "@/components/themed-text";
import { PageChromeLayout, PageHeader } from "@/components/page-chrome";
import { PAGE_CHROME } from "@/constants/page-chrome";
import { Fonts } from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";
import {
  formatInstanceTimeRemaining,
  getInstanceRemainingMs,
  isInstanceExpiringSoon,
} from "@/lib/instance-expiry";

type SwipePreview = { chatId: string; offset: -1 | 1 };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function ProjectChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const chatTransitionDistance = windowWidth;
  const scrollRef = useRef<ScrollView>(null);
  const initiallyScrolledSessionIdRef = useRef("");
  const focusedChatIdsRef = useRef(new Set<string>());
  const chatTransitionX = useRef(new Animated.Value(0)).current;
  const isChatTransitioningRef = useRef(false);
  const chatTransitionEntryXRef = useRef<number | null>(null);
  const pendingChatHandoffIdRef = useRef("");
  const params = useLocalSearchParams<{
    chatId?: string | string[];
    projectId?: string | string[];
    projectSessionId?: string | string[];
  }>();
  const projectSessionId = firstParam(params.projectSessionId);
  const projectId = firstParam(params.projectId);
  const opencodeSessionId = firstParam(params.chatId);
  const openTerminal = useCallback(() => {
    Keyboard.dismiss();
    router.push({
      pathname: "/projects/[projectId]/sessions/[projectSessionId]/terminal",
      params: { projectId, projectSessionId },
    });
  }, [projectId, projectSessionId, router]);
  const storedSessionChats = useSessionChatsStore(
    (store) => store.chatsBySessionId[projectSessionId],
  );
  const storedMessagesByChat = useSessionChatsStore(
    (store) => store.messagesBySessionId[projectSessionId],
  );
  const sessionChats = storedSessionChats ?? [];
  const runtime = useProjectRuntime(projectSessionId);
  const now = useCurrentTime(Boolean(runtime.instance?.terminates_at));
  const instanceRemainingMs = getInstanceRemainingMs(
    runtime.instance?.terminates_at,
    now,
  );
  const isInstanceExpiring = isInstanceExpiringSoon(instanceRemainingMs);
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
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [swipePreview, setSwipePreview] = useState<SwipePreview | null>(null);
  // Keep the outgoing chat mounted while the next chat is fetched. Replacing it
  // with the loading screen between the exit and entrance animations causes a
  // visible flash and makes the swipe feel like two separate transitions.
  const displayedDataRef = useRef(sessionQuery.data);
  if (sessionQuery.data) displayedDataRef.current = sessionQuery.data;
  const data = sessionQuery.data ?? displayedDataRef.current;
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
    () => createChatTurns(visibleMessages, inventoryQuery.data?.models),
    [inventoryQuery.data?.models, visibleMessages],
  );
  const swipePreviewTurns = useMemo(
    () =>
      createChatTurns(
        swipePreview ? (storedMessagesByChat?.[swipePreview.chatId] ?? []) : [],
        inventoryQuery.data?.models,
      ),
    [inventoryQuery.data?.models, storedMessagesByChat, swipePreview],
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
    router.setParams({
      chatId: "new",
      directory: data?.session.directory ?? "",
      ...(selection.agent ? { agent: selection.agent } : {}),
      ...(selection.model ? { model: selection.model } : {}),
      ...(selection.variant ? { variant: selection.variant } : {}),
      returnOpencodeSessionId: opencodeSessionId,
      returnProjectId: projectId,
      returnProjectSessionId: projectSessionId,
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
        router.setParams({ chatId: target.opencodeSessionId });
      }
      return;
    }

    router.replace({
      pathname: "/projects/[projectId]/sessions/[projectSessionId]/chat",
      params: {
        chatId: target.opencodeSessionId,
        projectId: target.projectId,
        projectSessionId: target.projectSessionId,
      },
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

  const getRelativeChat = useCallback(
    (offset: -1 | 1) => {
      if (sessionChats.length < 2) return undefined;
      const currentIndex = sessionChats.findIndex(
        (chat) => chat.id === opencodeSessionId,
      );
      const baseIndex = currentIndex >= 0 ? currentIndex : 0;
      return sessionChats[
        (baseIndex + offset + sessionChats.length) % sessionChats.length
      ];
    },
    [opencodeSessionId, sessionChats],
  );

  const showRelativeChatPreview = useCallback(
    (offset: -1 | 1) => {
      const nextChat = getRelativeChat(offset);
      if (!nextChat) return;
      setSwipePreview((current) =>
        current?.chatId === nextChat.id && current.offset === offset
          ? current
          : { chatId: nextChat.id, offset },
      );
    },
    [getRelativeChat],
  );

  const switchRelativeChat = useCallback(
    (offset: -1 | 1) => {
      if (isChatTransitioningRef.current) return;
      const nextChat = getRelativeChat(offset);
      if (!nextChat) return;

      showRelativeChatPreview(offset);
      isChatTransitioningRef.current = true;
      const exitX =
        offset === 1 ? -chatTransitionDistance : chatTransitionDistance;
      chatTransitionX.stopAnimation();
      Animated.timing(chatTransitionX, {
        duration: 190,
        easing: Easing.inOut(Easing.cubic),
        toValue: exitX,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          isChatTransitioningRef.current = false;
          setSwipePreview(null);
          return;
        }

        chatTransitionEntryXRef.current = -exitX;
        // This is the same screen with a different chat id. Updating the route
        // params avoids triggering a second native stack transition.
        router.setParams({ chatId: nextChat.id });
      });
    },
    [
      chatTransitionX,
      chatTransitionDistance,
      getRelativeChat,
      router,
      showRelativeChatPreview,
    ],
  );

  useEffect(() => {
    const entryX = chatTransitionEntryXRef.current;
    if (
      !sessionQuery.data ||
      sessionQuery.data.session.id !== opencodeSessionId ||
      entryX === null
    )
      return;

    chatTransitionEntryXRef.current = null;
    if (swipePreview?.chatId === opencodeSessionId) {
      // Keep the cached preview at x=0 while the real chat mounts offscreen.
      // Its ScrollView completes the handoff only after it is at the end.
      pendingChatHandoffIdRef.current = opencodeSessionId;
      return;
    }

    chatTransitionX.setValue(entryX);
    requestAnimationFrame(() =>
      Animated.timing(chatTransitionX, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }).start(() => {
        isChatTransitioningRef.current = false;
      }),
    );
  }, [chatTransitionX, opencodeSessionId, sessionQuery.data, swipePreview]);

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
        onPanResponderMove: (_, gesture) => {
          showRelativeChatPreview(gesture.dx < 0 ? 1 : -1);
          chatTransitionX.setValue(
            Math.max(
              -chatTransitionDistance * 0.34,
              Math.min(chatTransitionDistance * 0.34, gesture.dx * 0.72),
            ),
          );
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -42) switchRelativeChat(1);
          else if (gesture.dx > 42) switchRelativeChat(-1);
          else {
            Animated.spring(chatTransitionX, {
              damping: 18,
              stiffness: 220,
              toValue: 0,
              useNativeDriver: true,
            }).start(() => setSwipePreview(null));
          }
        },
        onPanResponderTerminate: () =>
          Animated.spring(chatTransitionX, {
            damping: 18,
            stiffness: 220,
            toValue: 0,
            useNativeDriver: true,
          }).start(() => setSwipePreview(null)),
        onShouldBlockNativeResponder: () => true,
      }),
    [
      chatTransitionX,
      chatTransitionDistance,
      isKeyboardVisible,
      sessionChats.length,
      showRelativeChatPreview,
      switchRelativeChat,
    ],
  );

  useEffect(() => {
    useSessionChatsStore
      .getState()
      .setChatUnread(projectSessionId, opencodeSessionId, false);
  }, [opencodeSessionId, projectSessionId]);

  useEffect(() => {
    if (!sessionQuery.data) return;
    const store = useSessionChatsStore.getState();
    store.upsertSessionChat(projectSessionId, sessionQuery.data.session);
    store.setChatMessages(
      projectSessionId,
      opencodeSessionId,
      sessionQuery.data.messages,
    );
    store.setChatStatus(
      projectSessionId,
      opencodeSessionId,
      sessionQuery.data.status,
    );
    store.setChatAttention(
      projectSessionId,
      opencodeSessionId,
      sessionQuery.data.questions.length > 0,
    );
  }, [opencodeSessionId, projectSessionId, sessionQuery.data]);

  useFocusEffect(
    useCallback(() => {
      const chatKey = `${projectSessionId}:${opencodeSessionId}`;
      if (!projectSessionId || !opencodeSessionId) return;

      if (!focusedChatIdsRef.current.has(chatKey)) {
        focusedChatIdsRef.current.add(chatKey);
        return;
      }

      void sessionQuery.resync();
    }, [opencodeSessionId, projectSessionId, sessionQuery.resync]),
  );

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
      },
    );
  };

  const dismissQuestion = (requestId: string) => {
    rejectQuestion.mutate(requestId, {
      onError: (error) =>
        Alert.alert("Could not dismiss the question", error.message),
    });
  };

  const refreshManually = async () => {
    if (isManuallyRefreshing) return;

    setIsManuallyRefreshing(true);
    try {
      await Promise.allSettled([
        sessionQuery.resync(),
        inventoryQuery.refetch(),
      ]);
    } finally {
      setIsManuallyRefreshing(false);
    }
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
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <ProjectChatStatus
          description="This project session is no longer running or its connection expired."
          onBack={goBack}
          title="OpenCode server unavailable"
        />
      </View>
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
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <ProjectChatStatus
          description={
            sessionQuery.error?.message ?? "OpenCode returned no chat data."
          }
          onBack={goBack}
          title="Could not load chat"
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <>
        <View style={styles.screen}>
          <PageChromeLayout
            bottom={
              <View
                pointerEvents="none"
                style={{ height: PAGE_CHROME.bottom.composerFadeInset }}
              />
            }
            top={
              <PageHeader
                accessibilityLabel="Switch chat"
                onBack={goBack}
                onTitlePress={() => setIsChatSwitcherOpen(true)}
                right={
                  <View
                    style={[
                      styles.headerActions,
                      { backgroundColor: theme.backgroundElement },
                    ]}
                  >
                    <ProjectSettingsButton
                      projectId={projectId}
                      projectSessionId={projectSessionId}
                    />
                    <ProjectDomainsButton
                      instanceId={runtime.instance.id}
                      opencodePassword={runtime.password}
                      projectId={projectId}
                    />
                    <Pressable
                      accessibilityLabel="Reload chat"
                      accessibilityRole="button"
                      disabled={isManuallyRefreshing}
                      onPress={() => void refreshManually()}
                      style={({ pressed }) => [
                        styles.headerAction,
                        pressed && styles.pressed,
                      ]}
                    >
                      {isManuallyRefreshing ? (
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
                }
                title={data.session.title || "Untitled chat"}
                titleContainerStyle={
                  isInstanceExpiring
                    ? {
                        backgroundColor: "rgba(245, 158, 11, 0.14)",
                        borderColor: "rgba(245, 158, 11, 0.55)",
                        borderWidth: 1,
                      }
                    : undefined
                }
                titleLeading={
                  isInstanceExpiring ? (
                    <SymbolView
                      name={{ ios: "clock.fill", android: "schedule" }}
                      size={13}
                      tintColor="#f59e0b"
                    />
                  ) : undefined
                }
                titleTrailing={
                  <>
                    {isInstanceExpiring ? (
                      <ThemedText style={styles.headerCountdown}>
                        {formatInstanceTimeRemaining(instanceRemainingMs)}
                      </ThemedText>
                    ) : null}
                    <SymbolView
                      name={{
                        ios: "chevron.down",
                        android: "keyboard_arrow_down",
                      }}
                      size={13}
                      tintColor={theme.textSecondary}
                    />
                  </>
                }
                titleVariant="pill"
              />
            }
          >
            {({ topInset }) => (
              <>
                <View style={styles.chatPreviewViewport}>
                  {swipePreview ? (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.adjacentChatPreview,
                        { backgroundColor: theme.background },
                        {
                          transform: [
                            {
                              translateX: Animated.add(
                                chatTransitionX,
                                swipePreview.offset * chatTransitionDistance,
                              ),
                            },
                          ],
                        },
                      ]}
                    >
                      <AdjacentChatPreview
                        topInset={topInset}
                        turns={swipePreviewTurns}
                      />
                    </Animated.View>
                  ) : null}

                  <Animated.View
                    style={[
                      styles.chatPreview,
                      { backgroundColor: theme.background },
                      { transform: [{ translateX: chatTransitionX }] },
                    ]}
                    {...pageSwipeResponder.panHandlers}
                  >
                    <ScrollView
                      contentOffset={{ x: 0, y: 1_000_000 }}
                      contentContainerStyle={[
                        styles.messages,
                        { paddingTop: topInset },
                      ]}
                      keyboardDismissMode="interactive"
                      keyboardShouldPersistTaps="handled"
                      key={opencodeSessionId}
                      onContentSizeChange={() => {
                        if (data.session.id !== opencodeSessionId) return;

                        const isPendingHandoff =
                          pendingChatHandoffIdRef.current === opencodeSessionId;
                        if (
                          !isPendingHandoff &&
                          initiallyScrolledSessionIdRef.current ===
                            opencodeSessionId
                        ) {
                          return;
                        }

                        initiallyScrolledSessionIdRef.current =
                          opencodeSessionId;
                        requestAnimationFrame(() => {
                          scrollRef.current?.scrollToEnd({ animated: false });
                          if (!isPendingHandoff) return;

                          requestAnimationFrame(() => {
                            if (
                              pendingChatHandoffIdRef.current !==
                              opencodeSessionId
                            )
                              return;

                            pendingChatHandoffIdRef.current = "";
                            chatTransitionX.setValue(0);
                            setSwipePreview(null);
                            isChatTransitioningRef.current = false;
                          });
                        });
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
                              sessionQuery.isStreaming &&
                              index === turns.length - 1
                            }
                            item={turn}
                            key={turn.id}
                            onRevert={() =>
                              revertSession.mutate(turn.id, {
                                onError: (error) =>
                                  Alert.alert(
                                    "Could not revert messages",
                                    error.message,
                                  ),
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
                          style={[
                            styles.emptyText,
                            { color: theme.textSecondary },
                          ]}
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
                  </Animated.View>
                </View>

                <View style={styles.composerOuter}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.inputSolidBackground,
                      { backgroundColor: theme.background },
                    ]}
                  />
                  {!showRawResponse && revertedQuestions.length > 0 ? (
                    <RevertedMessagesPanel
                      messages={revertedQuestions}
                      onRestore={(messageId, nextMessageId) =>
                        restoreMessage.mutate(
                          { messageId, nextMessageId },
                          {
                            onError: (error) =>
                              Alert.alert(
                                "Could not restore message",
                                error.message,
                              ),
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
                      onOpenTerminal={openTerminal}
                      onToggleRaw={() =>
                        setShowRawResponse((visible) => !visible)
                      }
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
                  {sendPrompt.error || data.promptError ? (
                    <ThemedText style={styles.error}>
                      {sendPrompt.error?.message ?? data.promptError}
                    </ThemedText>
                  ) : null}
                </View>
              </>
            )}
          </PageChromeLayout>
        </View>
      </>
      <ProjectChatSwitcherDrawer
        current={{ opencodeSessionId, projectId, projectSessionId }}
        onClose={() => setIsChatSwitcherOpen(false)}
        onNewChat={(target) => {
          setIsChatSwitcherOpen(false);
          if (
            target.projectId === projectId &&
            target.projectSessionId === projectSessionId
          ) {
            router.setParams({
              chatId: "new",
              directory: target.directory,
              returnOpencodeSessionId: opencodeSessionId,
              returnProjectId: projectId,
              returnProjectSessionId: projectSessionId,
              ...(selection.agent ? { agent: selection.agent } : {}),
              ...(selection.model ? { model: selection.model } : {}),
              ...(selection.variant ? { variant: selection.variant } : {}),
            });
            return;
          }

          router.replace({
            pathname: "/projects/[projectId]/sessions/[projectSessionId]/chat",
            params: {
              ...target,
              chatId: "new",
              returnOpencodeSessionId: opencodeSessionId,
              returnProjectId: projectId,
              returnProjectSessionId: projectSessionId,
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
    </View>
  );
}

function AdjacentChatPreview({
  topInset,
  turns,
}: {
  topInset: number;
  turns: ReturnType<typeof createChatTurns>;
}) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <ScrollView
      contentOffset={{ x: 0, y: 1_000_000 }}
      contentContainerStyle={[
        styles.messages,
        styles.adjacentMessages,
        { paddingTop: topInset },
      ]}
      onContentSizeChange={() =>
        scrollRef.current?.scrollToEnd({ animated: false })
      }
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
    >
      {turns.length ? (
        turns.map((turn) => (
          <OpencodeChatTurn
            isReverting={false}
            isStreaming={false}
            item={turn}
            key={turn.id}
            onRevert={() => {}}
            revertDisabled
          />
        ))
      ) : (
        <View style={styles.adjacentPreviewLoading}>
          <ActivityIndicator size="small" />
        </View>
      )}
    </ScrollView>
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
  adjacentChatPreview: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  adjacentMessages: {
    flexGrow: 1,
  },
  adjacentPreviewLoading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  chatPreview: {
    flex: 1,
  },
  chatPreviewViewport: {
    flex: 1,
    overflow: "hidden",
  },
  composerOuter: {
    backgroundColor: "transparent",
    bottom: 0,
    gap: 6,
    left: 0,
    paddingBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 6,
    position: "absolute",
    right: 0,
    zIndex: 2,
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
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    height: 42,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 16,
  },
  inputSolidBackground: {
    bottom: 0,
    height: PAGE_CHROME.bottom.estimatedInset,
    left: 0,
    position: "absolute",
    right: 0,
  },
  headerTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    maxWidth: "100%",
  },
  headerCountdown: {
    color: "#f59e0b",
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: "800",
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  messages: {
    gap: 28,
    paddingBottom: 150,
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
