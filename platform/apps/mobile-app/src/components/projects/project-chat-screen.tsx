import {
  findOpencodeFiles,
  OPENCODE_MESSAGE_PAGE_SIZE,
  type OpencodePromptSelection,
  type QuestionAnswer,
  type OpencodeSessionData,
  type OpencodeInventory,
  type OpencodeModelOption,
} from "@repo/api-client";
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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  FlatList,
  Dimensions,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import {
  createChatTurns,
  createChatTurnSelector,
  getRevertedMessageLabel,
  getSessionPromptSelection,
} from "@/components/projects/opencode-chat-turns";
import {
  ChatRevertDisabledContext,
  OpencodeChatTurn,
} from "@/components/projects/opencode-chat-turn";
import {
  type ComposerDraft,
  OpencodeComposerController,
} from "@/components/projects/opencode-composer";
import { OpencodeQuestionPrompt } from "@/components/projects/opencode-question-prompt";
import { ProjectChatStatus } from "@/components/projects/project-chat-status";
import {
  ProjectChatSwitcherDrawer,
  type ProjectChatTarget,
} from "@/components/projects/project-chat-switcher-drawer";
import { ProjectDomainsButton } from "@/components/projects/project-domains-drawer";
import { ProjectFilesButton } from "@/components/projects/project-files-button";
import { ProjectSettingsButton } from "@/components/projects/project-settings-button";
import { ThemedText } from "@/components/themed-text";
import { PageChromeLayout, PageHeader } from "@/components/page-chrome";
import { PAGE_CHROME } from "@/constants/page-chrome";
import { Fonts } from "@/constants/theme";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";
import {
  InstanceExpiryCountdown,
  useInstanceExpiryWarning,
} from "@/components/projects/instance-expiry-countdown";

type SwipePreview = { chatId: string; offset: -1 | 1 };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function ProjectChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [chatTransitionDistance, setChatTransitionDistance] = useState(
    () => Dimensions.get("window").width,
  );
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setChatTransitionDistance((width) =>
        width === window.width ? width : window.width,
      );
    });
    return () => subscription.remove();
  }, []);
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
  const sessionChatCount = useSessionChatsStore(
    (store) => store.chatsBySessionId[projectSessionId]?.length ?? 0,
  );
  const runtime = useProjectRuntime(projectSessionId);
  const isInstanceExpiring = useInstanceExpiryWarning(
    runtime.instance?.terminates_at,
  );
  const selectChatShellData = useMemo(
    () => createChatShellSelector(),
    [opencodeSessionId],
  );
  const sessionQuery = useOpencodeSession({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl: runtime.serverUrl,
    accessToken: runtime.accessToken,
    password: runtime.password,
    messageLimit: OPENCODE_MESSAGE_PAGE_SIZE,
    select: selectChatShellData,
    notifyOnChangeProps: ["data", "error", "isPending"],
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
  const revertTurn = useCallback(
    (id: string) => {
      revertSession.mutate(id, {
        onError: (error) =>
          Alert.alert("Could not revert messages", error.message),
      });
    },
    [revertSession.mutate],
  );
  const inventoryQuery = useOpencodeInventory(
    projectSessionId,
    runtime.serverUrl,
    runtime.accessToken,
    runtime.password,
  );
  const [isChatSwitcherOpen, setIsChatSwitcherOpen] = useState(false);
  const isKeyboardVisibleRef = useRef(false);
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [swipePreview, setSwipePreview] = useState<SwipePreview | null>(null);
  const previewMessages = useSessionChatsStore((store) =>
    swipePreview
      ? store.messagesBySessionId[projectSessionId]?.[swipePreview.chatId]
      : undefined,
  );
  // Keep the outgoing chat mounted while the next chat is fetched. Replacing it
  // with the loading screen between the exit and entrance animations causes a
  // visible flash and makes the swipe feel like two separate transitions.
  const displayedDataRef = useRef(sessionQuery.data);
  if (sessionQuery.data) displayedDataRef.current = sessionQuery.data;
  const data = sessionQuery.data ?? displayedDataRef.current;
  const searchFiles = useCallback(
    (query: string) =>
      findOpencodeFiles(
        projectSessionId,
        runtime.serverUrl,
        runtime.accessToken,
        query,
        data?.session.directory,
        runtime.password,
      ),
    [
      data?.session.directory,
      projectSessionId,
      runtime.accessToken,
      runtime.password,
      runtime.serverUrl,
    ],
  );
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
  const swipePreviewTurns = useMemo(
    () => createChatTurns(previewMessages ?? [], inventoryQuery.data?.models),
    [inventoryQuery.data?.models, previewMessages],
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

  const goBack = useCallback(() => router.replace("/"), [router]);

  const openNewChat = useCallback(() => {
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
  }, [
    data?.session.directory,
    opencodeSessionId,
    projectId,
    projectSessionId,
    router,
    selection.agent,
    selection.model,
    selection.variant,
  ]);

  const selectChat = (target: ProjectChatTarget) => {
    setIsChatSwitcherOpen(false);
    if (
      target.projectId === projectId &&
      target.projectSessionId === projectSessionId
    ) {
      if (target.opencodeSessionId !== opencodeSessionId) {
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
    const show = Keyboard.addListener("keyboardDidShow", () => {
      isKeyboardVisibleRef.current = true;
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      isKeyboardVisibleRef.current = false;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const getRelativeChat = useCallback(
    (offset: -1 | 1) => {
      const sessionChats =
        useSessionChatsStore.getState().chatsBySessionId[projectSessionId] ??
        [];
      if (sessionChats.length < 2) return undefined;
      const currentIndex = sessionChats.findIndex(
        (chat) => chat.id === opencodeSessionId,
      );
      const baseIndex = currentIndex >= 0 ? currentIndex : 0;
      return sessionChats[
        (baseIndex + offset + sessionChats.length) % sessionChats.length
      ];
    },
    [opencodeSessionId, projectSessionId, sessionChatCount],
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
          !isKeyboardVisibleRef.current &&
          sessionChatCount > 1 &&
          !isChatTransitioningRef.current &&
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isKeyboardVisibleRef.current &&
          sessionChatCount > 1 &&
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
      sessionChatCount,
      showRelativeChatPreview,
      switchRelativeChat,
    ],
  );

  useEffect(() => {
    useSessionChatsStore
      .getState()
      .setChatUnread(projectSessionId, opencodeSessionId, false);
  }, [opencodeSessionId, projectSessionId]);

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

  const submitQuestionAnswer = useCallback(
    (requestId: string, answers: QuestionAnswer[]) => {
      answerQuestion.mutate(
        { requestId, answers },
        {
          onError: (error) =>
            Alert.alert("Could not submit your answer", error.message),
        },
      );
    },
    [answerQuestion.mutate],
  );

  const dismissQuestion = useCallback(
    (requestId: string) => {
      rejectQuestion.mutate(requestId, {
        onError: (error) =>
          Alert.alert("Could not dismiss the question", error.message),
      });
    },
    [rejectQuestion.mutate],
  );

  const toggleRawResponse = useCallback(
    () => setShowRawResponse((visible) => !visible),
    [],
  );
  const refreshManually = useCallback(async () => {
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
  }, [inventoryQuery.refetch, isManuallyRefreshing, sessionQuery.resync]);
  const openChatSwitcher = useCallback(() => setIsChatSwitcherOpen(true), []);

  const completeChatHandoff = useCallback(() => {
    pendingChatHandoffIdRef.current = "";
    chatTransitionX.setValue(0);
    setSwipePreview(null);
    isChatTransitioningRef.current = false;
  }, [chatTransitionX]);

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
              <ProjectChatHeader
                instanceId={runtime.instance.id}
                isExpiring={isInstanceExpiring}
                isRefreshing={isManuallyRefreshing}
                onBack={goBack}
                onOpenSwitcher={openChatSwitcher}
                onRefresh={refreshManually}
                opencodePassword={runtime.password}
                projectId={projectId}
                projectSessionId={projectSessionId}
                terminatesAt={runtime.instance.terminates_at}
                title={data.session.title || "Untitled chat"}
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
                    <ChatTimeline
                      projectSessionId={projectSessionId}
                      opencodeSessionId={opencodeSessionId}
                      serverUrl={runtime.serverUrl}
                      accessToken={runtime.accessToken}
                      password={runtime.password}
                      models={inventoryQuery.data?.models}
                      topInset={topInset}
                      showRawResponse={showRawResponse}
                      isReverting={revertSession.isPending}
                      revertingId={revertSession.variables}
                      isRestoring={restoreMessage.isPending}
                      onRevert={revertTurn}
                      pendingChatHandoffIdRef={pendingChatHandoffIdRef}
                      onHandoffComplete={completeChatHandoff}
                    />
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
                      chatId={projectSessionId}
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
                      restoreDisabled={revertSession.isPending}
                      restoringMessageId={restoreMessage.variables?.messageId}
                      sessionId={opencodeSessionId}
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
                    <ProjectChatComposer
                      accessToken={runtime.accessToken}
                      accessibilityLabel="Follow-up prompt"
                      chatId={projectSessionId}
                      inventory={inventoryQuery.data}
                      password={runtime.password}
                      promptError={data.promptError}
                      serverUrl={runtime.serverUrl}
                      sessionId={opencodeSessionId}
                      onChangeSelection={setSelection}
                      key={opencodeSessionId}
                      onNewChat={openNewChat}
                      onOpenTerminal={openTerminal}
                      onToggleRaw={toggleRawResponse}
                      selection={selection}
                      searchFiles={searchFiles}
                      showRawResponse={showRawResponse}
                    />
                  )}
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

const ProjectChatComposer = memo(function ProjectChatComposer({
  accessToken,
  accessibilityLabel,
  chatId,
  inventory,
  onChangeSelection,
  onNewChat,
  onOpenTerminal,
  onToggleRaw,
  password,
  promptError,
  searchFiles,
  selection,
  serverUrl,
  sessionId,
  showRawResponse,
}: {
  accessToken: string;
  accessibilityLabel: string;
  chatId: string;
  inventory?: OpencodeInventory;
  onChangeSelection: (selection: OpencodePromptSelection) => void;
  onNewChat: () => void;
  onOpenTerminal: () => void;
  onToggleRaw: () => void;
  password?: string;
  promptError?: string;
  searchFiles: (query: string) => Promise<string[]>;
  selection: OpencodePromptSelection;
  serverUrl: string;
  sessionId: string;
  showRawResponse: boolean;
}) {
  const isStreaming = useSessionChatsStore(
    (store) =>
      store.statusesBySessionId[chatId]?.[sessionId]?.type !== "idle" &&
      Boolean(store.statusesBySessionId[chatId]?.[sessionId]),
  );
  const sendPrompt = useSendOpencodePrompt({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const abortSession = useAbortOpencodeSession({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const submit = useCallback(
    (draft: ComposerDraft, restore: () => void) => {
      const { attachments, fileReferences, text } = draft;
      if (
        (!text && attachments.length === 0) ||
        sendPrompt.isPending ||
        isStreaming
      )
        return;
      sendPrompt.mutate(
        {
          text,
          files: [],
          attachments,
          fileReferences,
          selection,
        },
        { onError: restore },
      );
    },
    [isStreaming, selection, sendPrompt.isPending, sendPrompt.mutate],
  );
  const stopStreaming = useCallback(() => {
    abortSession.mutate(undefined, {
      onError: (error) => Alert.alert("Could not stop OpenCode", error.message),
    });
  }, [abortSession.mutate]);

  return (
    <>
      <OpencodeComposerController
        accessibilityLabel={accessibilityLabel}
        inventory={inventory}
        isStopping={abortSession.isPending}
        isSubmitting={sendPrompt.isPending}
        onChangeSelection={onChangeSelection}
        onNewChat={onNewChat}
        onOpenTerminal={onOpenTerminal}
        onToggleRaw={onToggleRaw}
        onStop={isStreaming ? stopStreaming : undefined}
        onSubmit={submit}
        placeholder={
          isStreaming ? "Write your next message…" : "Ask a follow-up…"
        }
        selection={selection}
        searchFiles={searchFiles}
        showRawResponse={showRawResponse}
        submitDisabled={isStreaming}
      />
      {sendPrompt.error || promptError ? (
        <ThemedText style={styles.error}>
          {sendPrompt.error?.message ?? promptError}
        </ThemedText>
      ) : null}
    </>
  );
});

// The shell observes only fields that can change its chrome and bottom controls.
// Session timestamps, assistant parts, and status events stay in the timeline.
function createChatShellSelector() {
  let previous: OpencodeSessionData | undefined;
  return (data: OpencodeSessionData): OpencodeSessionData => {
    const messages = data.messages.filter(
      (message) => message.info.role === "user",
    );
    if (
      previous &&
      previous.session.id === data.session.id &&
      previous.session.title === data.session.title &&
      previous.session.directory === data.session.directory &&
      previous.session.agent === data.session.agent &&
      previous.session.revert?.messageID === data.session.revert?.messageID &&
      previous.session.model?.providerID === data.session.model?.providerID &&
      previous.session.model?.id === data.session.model?.id &&
      previous.session.model?.variant === data.session.model?.variant &&
      previous.promptError === data.promptError &&
      sameItems(previous.messages, messages) &&
      sameItems(previous.questions, data.questions)
    ) {
      return previous;
    }
    previous = {
      ...data,
      messages,
      changes: [],
      status: { type: "idle" },
    };
    return previous;
  };
}

function sameItems<T>(previous: T[], next: T[]) {
  return (
    previous.length === next.length &&
    next.every((item, index) => item === previous[index])
  );
}

const ChatTimeline = memo(function ChatTimeline({
  projectSessionId,
  opencodeSessionId,
  serverUrl,
  accessToken,
  password,
  models,
  topInset,
  showRawResponse,
  isReverting,
  revertingId,
  isRestoring,
  onRevert,
  pendingChatHandoffIdRef,
  onHandoffComplete,
}: {
  projectSessionId: string;
  opencodeSessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
  models?: OpencodeModelOption[];
  topInset: number;
  showRawResponse: boolean;
  isReverting: boolean;
  revertingId?: string;
  isRestoring: boolean;
  onRevert: (id: string) => void;
  pendingChatHandoffIdRef: { current: string };
  onHandoffComplete: () => void;
}) {
  const theme = useTheme();
  const scrollRef =
    useRef<FlatList<ReturnType<typeof createChatTurns>[number]>>(null);
  const initiallyScrolledSessionIdRef = useRef("");
  const sessionQuery = useOpencodeSession({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl,
    accessToken,
    password,
    messageLimit: OPENCODE_MESSAGE_PAGE_SIZE,
    refetchOnMount: false,
  });
  const data = sessionQuery.data;
  const activeQuestion = data?.questions[0];
  const selectTurns = useMemo(
    () => createChatTurnSelector(),
    [opencodeSessionId],
  );
  const turns = useMemo(() => {
    const messages = data?.messages ?? [];
    const revertIndex = data?.session.revert?.messageID
      ? messages.findIndex(
          (message) => message.info.id === data.session.revert?.messageID,
        )
      : -1;
    return selectTurns(
      revertIndex < 0 ? messages : messages.slice(0, revertIndex),
      models,
    );
  }, [data?.messages, data?.session.revert?.messageID, models, selectTurns]);
  useEffect(() => {
    if (!sessionQuery.data) return;
    const store = useSessionChatsStore.getState();
    store.upsertSessionChat(projectSessionId, sessionQuery.data.session);
    if (
      store.getChatMessages(projectSessionId, opencodeSessionId) !==
      sessionQuery.data.messages
    )
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
  if (!data) return null;
  return (
    <>
      {showRawResponse ? (
        <ScrollView
          contentContainerStyle={[styles.messages, { paddingTop: topInset }]}
          horizontal
          showsHorizontalScrollIndicator
        >
          <ThemedText selectable style={styles.rawResponse}>
            {JSON.stringify(data, null, 2)}
          </ThemedText>
        </ScrollView>
      ) : (
        <ChatRevertDisabledContext.Provider
          value={sessionQuery.isStreaming || isReverting || isRestoring}
        >
          <FlatList
            contentOffset={{ x: 0, y: 1_000_000 }}
            contentContainerStyle={[styles.messages, { paddingTop: topInset }]}
            data={turns}
            initialNumToRender={6}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            key={opencodeSessionId}
            keyExtractor={(turn) => turn.id}
            ListEmptyComponent={
              !activeQuestion && !sessionQuery.isStreaming ? (
                <ThemedText
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  Start the chat by describing what you want to build.
                </ThemedText>
              ) : sessionQuery.isStreaming ? (
                <View style={styles.thinking}>
                  <ActivityIndicator size="small" />
                  <ThemedText themeColor="textSecondary">
                    Vibeongo is working…
                  </ThemedText>
                </View>
              ) : null
            }
            ListHeaderComponent={
              sessionQuery.hasOlderMessages ? (
                <Pressable
                  accessibilityLabel="Load earlier messages"
                  accessibilityRole="button"
                  disabled={sessionQuery.isLoadingOlder}
                  onPress={() =>
                    void sessionQuery
                      .loadOlder()
                      .catch((error: unknown) =>
                        Alert.alert(
                          "Could not load earlier messages",
                          error instanceof Error
                            ? error.message
                            : "Please try again.",
                        ),
                      )
                  }
                  style={({ pressed }) => [
                    styles.loadEarlierButton,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  {sessionQuery.isLoadingOlder ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <ThemedText style={styles.loadEarlierText}>
                      Load earlier messages
                    </ThemedText>
                  )}
                </Pressable>
              ) : null
            }
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
            maxToRenderPerBatch={5}
            onContentSizeChange={() => {
              if (data.session.id !== opencodeSessionId) return;

              const isPendingHandoff =
                pendingChatHandoffIdRef.current === opencodeSessionId;
              if (
                !isPendingHandoff &&
                initiallyScrolledSessionIdRef.current === opencodeSessionId
              ) {
                return;
              }

              initiallyScrolledSessionIdRef.current = opencodeSessionId;
              requestAnimationFrame(() => {
                scrollRef.current?.scrollToEnd({
                  animated: false,
                });
                if (!isPendingHandoff) return;

                requestAnimationFrame(() => {
                  if (pendingChatHandoffIdRef.current !== opencodeSessionId)
                    return;

                  onHandoffComplete();
                });
              });
            }}
            ref={scrollRef}
            removeClippedSubviews={Platform.OS === "android"}
            renderItem={({ item: turn, index }) => (
              <OpencodeChatTurn
                isReverting={isReverting && revertingId === turn.id}
                isStreaming={
                  sessionQuery.isStreaming && index === turns.length - 1
                }
                item={turn}
                onRevert={onRevert}
              />
            )}
            showsVerticalScrollIndicator={false}
            windowSize={5}
          />
        </ChatRevertDisabledContext.Provider>
      )}
    </>
  );
});

const ProjectChatHeader = memo(function ProjectChatHeader({
  instanceId,
  isExpiring,
  isRefreshing,
  onBack,
  onOpenSwitcher,
  onRefresh,
  opencodePassword,
  projectId,
  projectSessionId,
  terminatesAt,
  title,
}: {
  instanceId: string;
  isExpiring: boolean;
  isRefreshing: boolean;
  onBack: () => void;
  onOpenSwitcher: () => void;
  onRefresh: () => void;
  opencodePassword?: string;
  projectId: string;
  projectSessionId: string;
  terminatesAt: Date | number | string | null | undefined;
  title: string;
}) {
  const theme = useTheme();
  return (
    <PageHeader
      accessibilityLabel="Switch chat"
      onBack={onBack}
      onTitlePress={onOpenSwitcher}
      right={
        <View
          style={[
            styles.headerActions,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          <ProjectFilesButton
            projectId={projectId}
            projectSessionId={projectSessionId}
          />
          <ProjectSettingsButton
            projectId={projectId}
            projectSessionId={projectSessionId}
          />
          <ProjectDomainsButton
            instanceId={instanceId}
            opencodePassword={opencodePassword}
            projectId={projectId}
          />
          <Pressable
            accessibilityLabel="Reload chat"
            accessibilityRole="button"
            disabled={isRefreshing}
            onPress={() => void onRefresh()}
            style={({ pressed }) => [
              styles.headerAction,
              pressed && styles.pressed,
            ]}
          >
            {isRefreshing ? (
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
      title={title}
      titleContainerStyle={
        isExpiring
          ? {
              backgroundColor: "rgba(245, 158, 11, 0.14)",
              borderColor: "rgba(245, 158, 11, 0.55)",
              borderWidth: 1,
            }
          : undefined
      }
      titleLeading={
        isExpiring ? (
          <SymbolView
            name={{ ios: "clock.fill", android: "schedule" }}
            size={13}
            tintColor="#f59e0b"
          />
        ) : undefined
      }
      titleTrailing={
        <>
          {isExpiring ? (
            <InstanceExpiryCountdown
              style={styles.headerCountdown}
              terminatesAt={terminatesAt}
            />
          ) : null}
          <SymbolView
            name={{ ios: "chevron.down", android: "keyboard_arrow_down" }}
            size={13}
            tintColor={theme.textSecondary}
          />
        </>
      }
      titleVariant="pill"
    />
  );
});

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
  chatId,
  messages,
  restoringMessageId,
  restoreDisabled,
  sessionId,
  onRestore,
}: {
  chatId: string;
  messages: Array<{ id: string; label: string }>;
  restoringMessageId?: string;
  restoreDisabled: boolean;
  sessionId: string;
  onRestore: (messageId: string, nextMessageId?: string) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  const isStreaming = useSessionChatsStore(
    (store) =>
      store.statusesBySessionId[chatId]?.[sessionId]?.type !== "idle" &&
      Boolean(store.statusesBySessionId[chatId]?.[sessionId]),
  );
  const disabled = restoreDisabled || isStreaming;
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
                disabled={disabled || restoringMessageId !== undefined}
                onPress={() => onRestore(message.id, messages[index + 1]?.id)}
                style={({ pressed }) => [
                  styles.restoreButton,
                  { borderColor: theme.backgroundSelected },
                  (disabled || restoringMessageId !== undefined) &&
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
  loadEarlierButton: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 160,
    paddingHorizontal: 14,
  },
  loadEarlierText: {
    fontSize: 12,
    fontWeight: "600",
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
