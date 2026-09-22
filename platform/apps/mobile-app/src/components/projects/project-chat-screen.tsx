import {
  findOpencodeFiles,
  OPENCODE_MESSAGE_PAGE_SIZE,
  visibleTimelineMessages,
  type OpencodePromptSelection,
  type OpencodeQueuedPrompt,
  type QuestionAnswer,
  type OpencodeSessionData,
  type OpencodeInventory,
  type OpencodeModelOption,
} from "@repo/api-client";
import {
  useAbortOpencodeSession,
  useAnswerOpencodeQuestion,
  useCancelOpencodeQueuedPrompt,
  useDeleteOpencodeSession,
  useEditOpencodeQueuedPrompt,
  useForkOpencodeSession,
  useOpencodeInventory,
  useOpencodeSession,
  useQueueOpencodePrompt,
  useRejectOpencodeQuestion,
  useReorderOpencodeQueuedPrompts,
  useRestoreRevertedOpencodeMessage,
  useRevertOpencodeSession,
  useSendOpencodePrompt,
  useSteerOpencodeQueuedPrompt,
  useOpencodeWebSearchProviders,
  useReplyOpencodePermission,
  useReplyOpencodeWebSearchRequest,
} from "@repo/api-hooks";
import { useSessionChatsStore } from "@repo/app-store";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import {
  createChatTurnCache,
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
import { OpencodeForkDrawer } from "@/components/projects/opencode-fork-drawer";
import { OpencodePermissionPrompt } from "@/components/projects/opencode-permission-prompt";
import { OpencodeWebSearchPrompt } from "@/components/projects/opencode-web-search-prompt";
import { ProjectChatStatus } from "@/components/projects/project-chat-status";
import {
  ProjectChatSwitcherDrawer,
  type ProjectChatTarget,
} from "@/components/projects/project-chat-switcher-drawer";
import { ProjectWorkspaceTopBar } from "@/components/projects/project-workspace-top-bar";
import { ThemedText } from "@/components/themed-text";
import { PageChromeLayout } from "@/components/page-chrome";
import { PAGE_CHROME } from "@/constants/page-chrome";
import { Fonts } from "@/constants/theme";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";
import { useInstanceExpiryWarning } from "@/components/projects/instance-expiry-countdown";

type ChatScrollState = {
  contentHeight: number;
  distanceFromBottom: number;
  offset: number;
  viewportHeight: number;
};
const CHAT_CACHE_TIME = 30 * 60 * 1_000;
const CHAT_SCROLL_STATE_LIMIT = 50;
const chatScrollStates = new Map<string, ChatScrollState>();

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function ProjectChatScreen() {
  const turnCache = useMemo(() => createChatTurnCache(), []);
  const theme = useTheme();
  const router = useRouter();
  const [composerHeight, setComposerHeight] = useState<number>(
    PAGE_CHROME.bottom.composerFadeInset,
  );
  const focusedChatIdsRef = useRef(new Set<string>());
  const params = useLocalSearchParams<{
    chatId?: string | string[];
    projectId?: string | string[];
    projectSessionId?: string | string[];
  }>();
  const projectSessionId = firstParam(params.projectSessionId);
  const projectId = firstParam(params.projectId);
  const opencodeSessionId = firstParam(params.chatId);
  const chatScrollKey = `${projectSessionId}:${opencodeSessionId}`;
  const saveChatScrollState = useCallback(
    (key: string, state: ChatScrollState) => {
      chatScrollStates.delete(key);
      chatScrollStates.set(key, state);
      if (chatScrollStates.size > CHAT_SCROLL_STATE_LIMIT) {
        chatScrollStates.delete(chatScrollStates.keys().next().value!);
      }
    },
    [],
  );
  const openTerminal = useCallback(() => {
    Keyboard.dismiss();
    router.push({
      pathname: "/projects/[projectId]/sessions/[projectSessionId]/terminal",
      params: { projectId, projectSessionId },
    });
  }, [projectId, projectSessionId, router]);
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
    gcTime: CHAT_CACHE_TIME,
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
  const replyPermission = useReplyOpencodePermission({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl: runtime.serverUrl,
    accessToken: runtime.accessToken,
    password: runtime.password,
  });
  const replyWebSearch = useReplyOpencodeWebSearchRequest({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl: runtime.serverUrl,
    accessToken: runtime.accessToken,
    password: runtime.password,
  });
  const deleteSession = useDeleteOpencodeSession({
    chatId: projectSessionId,
    serverUrl: runtime.serverUrl,
    accessToken: runtime.accessToken,
    password: runtime.password,
  });
  const forkSession = useForkOpencodeSession({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl: runtime.serverUrl,
    accessToken: runtime.accessToken,
    password: runtime.password,
  });
  const forkChat = useCallback(
    (messageId: string) => {
      if (forkSession.isPending) return;
      const userMessages = (sessionQuery.data?.messages ?? []).filter(
        (message) => message.info.role === "user",
      );
      const selectedIndex = userMessages.findIndex(
        (message) => message.info.id === messageId,
      );
      if (selectedIndex === -1) {
        Alert.alert(
          "Could not fork chat",
          "The selected message was not found.",
        );
        return;
      }
      const before = userMessages[selectedIndex + 1]?.info.id;
      forkSession.mutate(before, {
        onError: (error) => Alert.alert("Could not fork chat", error.message),
        onSuccess: (session) =>
          router.replace({
            pathname: "/projects/[projectId]/sessions/[projectSessionId]/chat",
            params: {
              chatId: session.id,
              projectId,
              projectSessionId,
            },
          }),
      });
    },
    [
      forkSession,
      projectId,
      projectSessionId,
      router,
      sessionQuery.data?.messages,
    ],
  );
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
  const [isSessionChatSwitcherOpen, setIsSessionChatSwitcherOpen] =
    useState(false);
  const [isForkDrawerOpen, setIsForkDrawerOpen] = useState(false);
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const data = sessionQuery.data;
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
  const activePermission = data?.permissions[0];
  const activeWebSearchRequest = data?.webSearchRequests[0];
  const webSearchProviders = useOpencodeWebSearchProviders({
    chatId: projectSessionId,
    directory: data?.session.directory ?? "",
    serverUrl: runtime.serverUrl,
    accessToken: runtime.accessToken,
    password: runtime.password,
    enabled: Boolean(
      activeWebSearchRequest && !activeWebSearchRequest.options.length,
    ),
  });

  useEffect(() => {
    setSelection(sessionSelection);
  }, [
    opencodeSessionId,
    sessionSelection.agent,
    sessionSelection.model,
    sessionSelection.variant,
  ]);

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
  const openChatSwitcher = useCallback(() => {
    Keyboard.dismiss();
    setIsChatSwitcherOpen(true);
  }, []);

  if (runtime.isPending && !data) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if ((runtime.isError || !runtime.instance) && !data) {
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

  if (sessionQuery.isPending && !data) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!data) {
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
              <ProjectWorkspaceTopBar
                changeCount={data.changes.length}
                connection={{
                  accessToken: runtime.accessToken,
                  chatId: projectSessionId,
                  directory: data.session.directory,
                  password: runtime.password,
                  serverUrl: runtime.serverUrl,
                }}
                instanceId={runtime.instance?.id ?? ""}
                isExpiring={isInstanceExpiring}
                isRefreshing={isManuallyRefreshing}
                onBack={goBack}
                onOpenSwitcher={openChatSwitcher}
                onForkChat={() => setIsForkDrawerOpen(true)}
                onRefresh={refreshManually}
                opencodePassword={runtime.password}
                opencodeSessionId={opencodeSessionId}
                projectId={projectId}
                projectSessionId={projectSessionId}
                terminatesAt={runtime.instance?.terminates_at}
                title={data.session.title || "Untitled chat"}
              />
            }
          >
            {({ topInset }) => (
              <>
                <View
                  style={[
                    styles.chatArea,
                    { backgroundColor: theme.background },
                  ]}
                >
                  <ChatTimeline
                    bottomInset={Math.max(
                      PAGE_CHROME.bottom.composerFadeInset,
                      composerHeight + 16,
                    )}
                    key={opencodeSessionId}
                    chatScrollKey={chatScrollKey}
                    initialScrollState={chatScrollStates.get(chatScrollKey)}
                    turnCache={turnCache}
                    projectSessionId={projectSessionId}
                    opencodeSessionId={opencodeSessionId}
                    serverUrl={runtime.serverUrl}
                    accessToken={runtime.accessToken}
                    password={runtime.password}
                    models={inventoryQuery.data?.models}
                    topInset={topInset}
                    isReverting={revertSession.isPending}
                    revertingId={revertSession.variables}
                    isRestoring={restoreMessage.isPending}
                    onRevert={revertTurn}
                    onScrollStateChange={saveChatScrollState}
                  />
                </View>

                <View
                  onLayout={(event) =>
                    setComposerHeight(event.nativeEvent.layout.height)
                  }
                  style={styles.composerOuter}
                >
                  <View
                    pointerEvents="none"
                    style={[
                      styles.inputSolidBackground,
                      { backgroundColor: theme.background },
                    ]}
                  />
                  {revertedQuestions.length > 0 ? (
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
                  {activePermission ? (
                    <OpencodePermissionPrompt
                      isSubmitting={replyPermission.isPending}
                      onReply={(requestId, decision) =>
                        replyPermission.mutate(
                          { requestId, decision },
                          {
                            onError: (error) =>
                              Alert.alert(
                                "Could not reply to permission",
                                error.message,
                              ),
                          },
                        )
                      }
                      request={activePermission}
                    />
                  ) : activeWebSearchRequest ? (
                    <OpencodeWebSearchPrompt
                      isLoading={webSearchProviders.isLoading}
                      isSubmitting={replyWebSearch.isPending}
                      onReply={(selection) =>
                        replyWebSearch.mutate(
                          { request: activeWebSearchRequest, selection },
                          {
                            onError: (error) =>
                              Alert.alert(
                                "Could not reply to web search",
                                error.message,
                              ),
                          },
                        )
                      }
                      providers={webSearchProviders.data}
                      request={activeWebSearchRequest}
                    />
                  ) : activeQuestion ? (
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
                      disabled={!runtime.serverUrl || !!sessionQuery.error}
                      accessToken={runtime.accessToken}
                      accessibilityLabel="Follow-up prompt"
                      chatId={projectSessionId}
                      inventory={inventoryQuery.data}
                      directory={data.session.directory}
                      onProviderConnected={async () => {
                        await inventoryQuery.refetch();
                      }}
                      password={runtime.password}
                      promptError={data.promptError}
                      pendingInbox={data.pendingInbox}
                      isStreaming={data.status.type !== "idle"}
                      serverUrl={runtime.serverUrl}
                      sessionId={opencodeSessionId}
                      onChangeSelection={setSelection}
                      key={opencodeSessionId}
                      onNewChat={openNewChat}
                      onOpenChats={() => {
                        Keyboard.dismiss();
                        setIsSessionChatSwitcherOpen(true);
                      }}
                      onOpenTerminal={openTerminal}
                      selection={selection}
                      searchFiles={searchFiles}
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
        newChatDirectoriesBySessionId={{
          [projectSessionId]: data.session.directory,
        }}
        onClose={() => setIsChatSwitcherOpen(false)}
        onDelete={(target) => {
          const remove = () =>
            deleteSession.mutate(target.opencodeSessionId, {
              onError: (error) =>
                Alert.alert("Could not delete chat", error.message),
              onSuccess: () => {
                setIsChatSwitcherOpen(false);
                if (target.opencodeSessionId === opencodeSessionId) {
                  router.setParams({
                    chatId: "new",
                    directory: data.session.directory,
                  });
                }
              },
            });
          Alert.alert("Delete chat?", "This removes the chat from OpenCode.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: remove },
          ]);
        }}
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
      <ProjectChatSwitcherDrawer
        current={{ opencodeSessionId, projectId, projectSessionId }}
        newChatDirectoriesBySessionId={{
          [projectSessionId]: data.session.directory,
        }}
        onClose={() => setIsSessionChatSwitcherOpen(false)}
        onDelete={(target) => {
          const remove = () =>
            deleteSession.mutate(target.opencodeSessionId, {
              onError: (error) =>
                Alert.alert("Could not delete chat", error.message),
              onSuccess: () => {
                setIsSessionChatSwitcherOpen(false);
                if (target.opencodeSessionId === opencodeSessionId) {
                  router.setParams({
                    chatId: "new",
                    directory: data.session.directory,
                  });
                }
              },
            });
          Alert.alert("Delete chat?", "This removes the chat from OpenCode.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: remove },
          ]);
        }}
        onNewChat={() => {
          setIsSessionChatSwitcherOpen(false);
          openNewChat();
        }}
        onSelect={(target) => {
          setIsSessionChatSwitcherOpen(false);
          selectChat(target);
        }}
        scopeProjectSessionId={projectSessionId}
        visible={isSessionChatSwitcherOpen}
      />
      <OpencodeForkDrawer
        messages={data.messages}
        onClose={() => setIsForkDrawerOpen(false)}
        onSelect={(messageId) => {
          setIsForkDrawerOpen(false);
          forkChat(messageId);
        }}
        visible={isForkDrawerOpen}
      />
    </View>
  );
}

const ProjectChatComposer = memo(function ProjectChatComposer({
  disabled,
  accessToken,
  accessibilityLabel,
  chatId,
  inventory,
  directory,
  onChangeSelection,
  onNewChat,
  onOpenChats,
  onOpenTerminal,
  onProviderConnected,
  password,
  promptError,
  pendingInbox,
  isStreaming,
  searchFiles,
  selection,
  serverUrl,
  sessionId,
}: {
  accessToken: string;
  disabled: boolean;
  accessibilityLabel: string;
  chatId: string;
  inventory?: OpencodeInventory;
  directory: string;
  onChangeSelection: (selection: OpencodePromptSelection) => void;
  onNewChat: () => void;
  onOpenChats: () => void;
  onOpenTerminal: () => void;
  onProviderConnected: () => Promise<void>;
  password?: string;
  promptError?: string;
  pendingInbox: OpencodeSessionData["pendingInbox"];
  isStreaming: boolean;
  searchFiles: (query: string) => Promise<string[]>;
  selection: OpencodePromptSelection;
  serverUrl: string;
  sessionId: string;
}) {
  const theme = useTheme();
  const sendPrompt = useSendOpencodePrompt({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const queuePrompt = useQueueOpencodePrompt({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const queuedPrompts = useMemo(
    () =>
      pendingInbox.filter(
        (item): item is OpencodeQueuedPrompt => item.delivery === "queue",
      ),
    [pendingInbox],
  );
  const [areQueuedPromptsExpanded, setAreQueuedPromptsExpanded] =
    useState(false);
  const [draggedQueuedPromptId, setDraggedQueuedPromptId] = useState<
    string | undefined
  >();
  const [editingQueuedPrompt, setEditingQueuedPrompt] = useState<
    { id: string; text: string } | undefined
  >();
  const queuedDragOffset = useRef(new Animated.Value(0)).current;
  const queuedDragStartY = useRef<number | undefined>(undefined);
  const cancelQueuedPrompt = useCancelOpencodeQueuedPrompt({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const steerQueuedPrompt = useSteerOpencodeQueuedPrompt({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const editQueuedPrompt = useEditOpencodeQueuedPrompt({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const reorderQueuedPrompts = useReorderOpencodeQueuedPrompts({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const moveQueuedPrompt = (source: number, destination: number) => {
    if (
      source === destination ||
      source < 0 ||
      destination < 0 ||
      source >= displayedQueuedPrompts.length ||
      destination >= displayedQueuedPrompts.length
    )
      return;
    const inboxIds = displayedQueuedPrompts.map((item) => item.id);
    const [moved] = inboxIds.splice(source, 1);
    inboxIds.splice(destination, 0, moved!);
    reorderQueuedPrompts.mutate(
      { inboxIds, queuedPrompts: displayedQueuedPrompts },
      {
        onError: (error) =>
          Alert.alert("Could not reorder messages", error.message),
      },
    );
  };
  const displayedQueuedPrompts = reorderQueuedPrompts.isPending
    ? reorderQueuedPrompts.variables.inboxIds.flatMap((id) =>
        reorderQueuedPrompts.variables.queuedPrompts.filter(
          (item) => item.id === id,
        ),
      )
    : queuedPrompts;
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
        queuePrompt.isPending
      )
        return;
      const input = {
        text,
        files: [],
        attachments,
        fileReferences,
        selection,
      };
      if (isStreaming) {
        queuePrompt.mutate(input, {
          onError: (error) => {
            restore();
            Alert.alert("Could not queue message", error.message);
          },
        });
        return;
      }
      sendPrompt.mutate(input, { onError: restore });
    },
    [
      isStreaming,
      queuePrompt.isPending,
      queuePrompt.mutate,
      selection,
      sendPrompt.isPending,
      sendPrompt.mutate,
    ],
  );
  const stopStreaming = useCallback(() => {
    abortSession.mutate(undefined, {
      onError: (error) => Alert.alert("Could not stop OpenCode", error.message),
    });
  }, [abortSession.mutate]);

  return (
    <>
      {queuedPrompts.length ? (
        <View
          style={[
            styles.queuedPrompts,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          {areQueuedPromptsExpanded
            ? displayedQueuedPrompts.map((item, index) => (
                <Animated.View
                  key={item.id}
                  style={[
                    styles.queuedPromptRow,
                    draggedQueuedPromptId === item.id
                      ? {
                          opacity: 0.8,
                          transform: [{ translateY: queuedDragOffset }],
                        }
                      : undefined,
                  ]}
                >
                  <View
                    accessible
                    accessibilityLabel="Drag to reorder queued message"
                    accessibilityRole="adjustable"
                    onMoveShouldSetResponder={() =>
                      !reorderQueuedPrompts.isPending
                    }
                    onResponderGrant={(event) => {
                      queuedDragStartY.current = event.nativeEvent.pageY;
                      queuedDragOffset.setValue(0);
                      setDraggedQueuedPromptId(item.id);
                    }}
                    onResponderMove={(event) => {
                      const startY = queuedDragStartY.current;
                      if (startY === undefined) return;
                      queuedDragOffset.setValue(
                        event.nativeEvent.pageY - startY,
                      );
                    }}
                    onResponderRelease={(event) => {
                      const startY = queuedDragStartY.current;
                      queuedDragStartY.current = undefined;
                      if (startY === undefined) return;
                      const offset = Math.round(
                        (event.nativeEvent.pageY - startY) / 32,
                      );
                      moveQueuedPrompt(
                        index,
                        Math.max(
                          0,
                          Math.min(
                            displayedQueuedPrompts.length - 1,
                            index + offset,
                          ),
                        ),
                      );
                      Animated.spring(queuedDragOffset, {
                        toValue: 0,
                        useNativeDriver: true,
                      }).start(() => setDraggedQueuedPromptId(undefined));
                    }}
                    style={styles.queuedPromptDragHandle}
                  >
                    <View style={styles.queuedPromptDragDots}>
                      {Array.from({ length: 6 }).map((_, dotIndex) => (
                        <View
                          key={dotIndex}
                          style={[
                            styles.queuedPromptDragDot,
                            { backgroundColor: theme.textSecondary },
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                  {editingQueuedPrompt?.id === item.id ? (
                    <TextInput
                      autoFocus
                      multiline
                      onChangeText={(text) =>
                        setEditingQueuedPrompt({ id: item.id, text })
                      }
                      style={[
                        styles.queuedPromptInput,
                        {
                          color: theme.text,
                          borderColor: theme.backgroundSelected,
                        },
                      ]}
                      value={editingQueuedPrompt.text}
                    />
                  ) : (
                    <ThemedText
                      numberOfLines={1}
                      style={[styles.queuedPrompt, { flex: 1 }]}
                    >
                      {item.prompt.text || "Attachment"}
                    </ThemedText>
                  )}
                  {editingQueuedPrompt?.id === item.id ? (
                    <>
                      <Pressable
                        accessibilityLabel="Save queued message"
                        accessibilityRole="button"
                        disabled={editQueuedPrompt.isPending}
                        onPress={() =>
                          editQueuedPrompt.mutate(
                            {
                              inboxId: item.id,
                              queuedPrompts: displayedQueuedPrompts,
                              text: editingQueuedPrompt.text,
                            },
                            {
                              onError: (error) =>
                                Alert.alert(
                                  "Could not edit message",
                                  error.message,
                                ),
                              onSuccess: () =>
                                setEditingQueuedPrompt(undefined),
                            },
                          )
                        }
                        style={styles.queuedPromptAction}
                      >
                        <SymbolView
                          name={{ ios: "checkmark", android: "check" }}
                          size={14}
                          tintColor={theme.textSecondary}
                        />
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Cancel editing queued message"
                        accessibilityRole="button"
                        onPress={() => setEditingQueuedPrompt(undefined)}
                        style={styles.queuedPromptAction}
                      >
                        <SymbolView
                          name={{ ios: "xmark", android: "close" }}
                          size={14}
                          tintColor={theme.textSecondary}
                        />
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      accessibilityLabel="Edit queued message"
                      accessibilityRole="button"
                      disabled={
                        cancelQueuedPrompt.isPending ||
                        steerQueuedPrompt.isPending ||
                        reorderQueuedPrompts.isPending
                      }
                      onPress={() =>
                        setEditingQueuedPrompt({
                          id: item.id,
                          text: item.prompt.text,
                        })
                      }
                      style={styles.queuedPromptAction}
                    >
                      <SymbolView
                        name={{ ios: "pencil", android: "edit" }}
                        size={14}
                        tintColor={theme.textSecondary}
                      />
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityLabel={
                      isStreaming
                        ? "Steer queued message"
                        : "Send queued message"
                    }
                    accessibilityRole="button"
                    disabled={
                      cancelQueuedPrompt.isPending ||
                      steerQueuedPrompt.isPending ||
                      reorderQueuedPrompts.isPending
                    }
                    onPress={() =>
                      steerQueuedPrompt.mutate(item.id, {
                        onError: (error) =>
                          Alert.alert("Could not steer message", error.message),
                      })
                    }
                    style={({ pressed }) => [
                      styles.queuedPromptAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={{ ios: "paperplane.fill", android: "send" }}
                      size={14}
                      tintColor={theme.textSecondary}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Remove queued message"
                    accessibilityRole="button"
                    disabled={
                      cancelQueuedPrompt.isPending ||
                      steerQueuedPrompt.isPending ||
                      reorderQueuedPrompts.isPending
                    }
                    onPress={() =>
                      cancelQueuedPrompt.mutate(item.id, {
                        onError: (error) =>
                          Alert.alert(
                            "Could not remove message",
                            error.message,
                          ),
                      })
                    }
                    style={({ pressed }) => [
                      styles.queuedPromptAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={{ ios: "trash", android: "delete" }}
                      size={14}
                      tintColor={theme.textSecondary}
                    />
                  </Pressable>
                </Animated.View>
              ))
            : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: areQueuedPromptsExpanded }}
            onPress={() => setAreQueuedPromptsExpanded((expanded) => !expanded)}
            style={({ pressed }) => [
              styles.queuedPromptsHeader,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={styles.queuedPromptsTitle}>
              Queued messages ({queuedPrompts.length})
            </ThemedText>
            <ThemedText
              style={[
                styles.queuedPromptsToggle,
                { color: theme.textSecondary },
              ]}
            >
              {areQueuedPromptsExpanded ? "Hide" : "Show"}
            </ThemedText>
            <SymbolView
              name={{
                ios: areQueuedPromptsExpanded ? "chevron.down" : "chevron.up",
                android: areQueuedPromptsExpanded
                  ? "expand_more"
                  : "keyboard_arrow_up",
              }}
              size={14}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        </View>
      ) : null}
      <OpencodeComposerController
        accessibilityLabel={accessibilityLabel}
        inventory={inventory}
        isStopping={abortSession.isPending}
        isSubmitting={sendPrompt.isPending || queuePrompt.isPending}
        onChangeSelection={onChangeSelection}
        onNewChat={onNewChat}
        onOpenChats={onOpenChats}
        onOpenTerminal={onOpenTerminal}
        onStop={isStreaming ? stopStreaming : undefined}
        onSubmit={submit}
        placeholder={isStreaming ? "Type " : "Ask a follow-up…"}
        providerConnection={{
          accessToken,
          chatId,
          directory,
          onConnected: onProviderConnected,
          password,
          serverUrl,
        }}
        selection={selection}
        searchFiles={searchFiles}
        disabled={disabled}
        submitDisabled={disabled}
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
// Session timestamps and assistant parts stay in the timeline.
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
      previous.status.type === data.status.type &&
      previous.changes.length === data.changes.length &&
      previous.promptError === data.promptError &&
      sameItems(previous.messages, messages) &&
      sameItems(previous.questions, data.questions) &&
      sameItems(previous.permissions, data.permissions) &&
      sameItems(previous.webSearchRequests, data.webSearchRequests) &&
      sameItems(previous.pendingInbox, data.pendingInbox)
    ) {
      return previous;
    }
    previous = {
      ...data,
      messages,
      changes: data.changes,
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

function getVisibleMessages(data: OpencodeSessionData) {
  const revertMessageId = data.session.revert?.messageID;
  if (!revertMessageId) {
    return visibleTimelineMessages(data.messages, data.pendingInbox);
  }

  const revertIndex = data.messages.findIndex(
    (message) => message.info.id === revertMessageId,
  );
  const messages =
    revertIndex < 0 ? data.messages : data.messages.slice(0, revertIndex);
  return visibleTimelineMessages(messages, data.pendingInbox);
}

function getCompletedMessages(data: OpencodeSessionData) {
  const messages = getVisibleMessages(data);
  if (data.status.type === "idle") return messages;

  const activeUserMessage = messages.findLast(
    (message) => message.info.role === "user",
  );
  if (!activeUserMessage) return messages;

  return messages.filter(
    (message) =>
      message.info.id !== activeUserMessage.info.id &&
      !(
        message.info.role === "assistant" &&
        message.info.parentID === activeUserMessage.info.id
      ),
  );
}

function createTimelineDataSelector() {
  let previous: OpencodeSessionData | undefined;

  return (data: OpencodeSessionData): OpencodeSessionData => {
    const messages = getVisibleMessages(data);
    if (
      previous &&
      previous.session.id === data.session.id &&
      previous.session.title === data.session.title &&
      previous.session.directory === data.session.directory &&
      previous.session.agent === data.session.agent &&
      previous.session.revert?.messageID === data.session.revert?.messageID &&
      previous.status.type === data.status.type &&
      previous.executionError === data.executionError &&
      previous.executionOutcome === data.executionOutcome &&
      previous.messagePage?.hasOlder === data.messagePage?.hasOlder &&
      previous.messagePage?.cursor === data.messagePage?.cursor &&
      sameItems(previous.messages, messages) &&
      sameItems(previous.questions, data.questions)
    ) {
      return previous;
    }

    previous = { ...data, messages };
    return previous;
  };
}

const ChatTimeline = memo(function ChatTimeline({
  bottomInset,
  chatScrollKey,
  initialScrollState,
  turnCache,
  projectSessionId,
  opencodeSessionId,
  serverUrl,
  accessToken,
  password,
  models,
  topInset,
  isReverting,
  revertingId,
  isRestoring,
  onRevert,
  onScrollStateChange,
}: {
  bottomInset: number;
  chatScrollKey: string;
  initialScrollState?: ChatScrollState;
  turnCache: ReturnType<typeof createChatTurnCache>;
  projectSessionId: string;
  opencodeSessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
  models?: OpencodeModelOption[];
  topInset: number;
  isReverting: boolean;
  revertingId?: string;
  isRestoring: boolean;
  onRevert: (id: string) => void;
  onScrollStateChange: (key: string, state: ChatScrollState) => void;
}) {
  const theme = useTheme();
  const selectTimelineData = useMemo(() => createTimelineDataSelector(), []);
  const sessionQuery = useOpencodeSession({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl,
    accessToken,
    password,
    messageLimit: OPENCODE_MESSAGE_PAGE_SIZE,
    select: selectTimelineData,
    notifyOnChangeProps: ["data", "error"],
    refetchOnMount: false,
    gcTime: CHAT_CACHE_TIME,
  });
  const data = sessionQuery.data;
  const activeQuestion = data?.questions[0];
  const selectTurns = useMemo(
    () =>
      turnCache(
        JSON.stringify([projectSessionId, serverUrl, opencodeSessionId]),
      ),
    [turnCache, projectSessionId, serverUrl, opencodeSessionId],
  );
  const turns = useMemo(
    () => selectTurns(data?.messages ?? [], models),
    [data?.messages, models, selectTurns],
  );
  const hasInlineExecutionError = useMemo(
    () =>
      (data?.messages ?? []).some(
        (message) => message.info.role === "assistant" && message.info.error,
      ),
    [data?.messages],
  );
  useEffect(() => {
    if (!sessionQuery.data) return;
    const store = useSessionChatsStore.getState();
    store.upsertSessionChat(projectSessionId, sessionQuery.data.session);
    store.setChatStatus(
      projectSessionId,
      opencodeSessionId,
      sessionQuery.data.status,
    );
    store.setChatAttention(
      projectSessionId,
      opencodeSessionId,
      sessionQuery.data.questions.length > 0 ||
        sessionQuery.data.permissions.length > 0 ||
        sessionQuery.data.webSearchRequests.length > 0,
    );
  }, [opencodeSessionId, projectSessionId, sessionQuery.data]);
  const activeTurnId = sessionQuery.isStreaming ? turns.at(-1)?.id : undefined;
  const latestTurnId = turns.at(-1)?.id;
  const listRef = useRef<FlatList<(typeof turns)[number]>>(null);
  const initialScrollStateRef = useRef(initialScrollState);
  const isPositioningRef = useRef(true);
  const positioningFrameRef = useRef<number | undefined>(undefined);
  const positioningVersionRef = useRef(0);
  const prependAnchorRef = useRef<
    | {
        contentHeight: number;
        offset: number;
      }
    | undefined
  >(undefined);
  const scrollMetricsRef = useRef({
    contentHeight: 0,
    offset: initialScrollState?.offset ?? 0,
    viewportHeight: 0,
  });
  const [isPositioned, setIsPositioned] = useState(false);
  const [isTimelineKeyboardVisible, setIsTimelineKeyboardVisible] = useState(
    () => Keyboard.isVisible(),
  );
  const keyboardScrollTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const scrollToLatest = useCallback((animated: boolean) => {
    listRef.current?.scrollToEnd({ animated });
  }, []);
  const getRestoredOffset = useCallback(() => {
    const metrics = scrollMetricsRef.current;
    const maximumOffset = Math.max(
      0,
      metrics.contentHeight - metrics.viewportHeight,
    );
    const saved = initialScrollStateRef.current;
    if (!saved) return maximumOffset;
    if (saved.distanceFromBottom <= 24) {
      return Math.max(0, maximumOffset - saved.distanceFromBottom);
    }
    return Math.min(saved.offset, maximumOffset);
  }, []);
  const positionTimeline = useCallback(() => {
    const metrics = scrollMetricsRef.current;
    if (
      !isPositioningRef.current ||
      metrics.viewportHeight <= 0 ||
      metrics.contentHeight <= 0
    ) {
      return;
    }

    const version = ++positioningVersionRef.current;
    if (positioningFrameRef.current !== undefined) {
      cancelAnimationFrame(positioningFrameRef.current);
    }
    const applyPosition = () => {
      const offset = getRestoredOffset();
      scrollMetricsRef.current.offset = offset;
      listRef.current?.scrollToOffset({ animated: false, offset });
    };
    applyPosition();
    positioningFrameRef.current = requestAnimationFrame(() => {
      applyPosition();
      positioningFrameRef.current = requestAnimationFrame(() => {
        if (
          !isPositioningRef.current ||
          positioningVersionRef.current !== version
        ) {
          return;
        }
        applyPosition();
        isPositioningRef.current = false;
        positioningFrameRef.current = undefined;
        setIsPositioned(true);
      });
    });
  }, [getRestoredOffset]);
  const saveCurrentScrollState = useCallback(() => {
    if (isPositioningRef.current) return;
    const metrics = scrollMetricsRef.current;
    if (metrics.viewportHeight <= 0 || metrics.contentHeight <= 0) return;
    onScrollStateChange(chatScrollKey, {
      ...metrics,
      distanceFromBottom: Math.max(
        0,
        metrics.contentHeight - metrics.viewportHeight - metrics.offset,
      ),
    });
  }, [chatScrollKey, onScrollStateChange]);
  const handleTimelineLayout = useCallback(
    (event: LayoutChangeEvent) => {
      scrollMetricsRef.current.viewportHeight = event.nativeEvent.layout.height;
      positionTimeline();
    },
    [positionTimeline],
  );
  const handleTimelineContentSizeChange = useCallback(
    (_width: number, height: number) => {
      const prependAnchor = prependAnchorRef.current;
      scrollMetricsRef.current.contentHeight = height;
      if (prependAnchor && height > prependAnchor.contentHeight) {
        const offset =
          prependAnchor.offset + (height - prependAnchor.contentHeight);
        prependAnchorRef.current = undefined;
        scrollMetricsRef.current.offset = offset;
        listRef.current?.scrollToOffset({ animated: false, offset });
        return;
      }
      positionTimeline();
    },
    [positionTimeline],
  );
  const handleTimelineScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      scrollMetricsRef.current = {
        contentHeight: contentSize.height,
        offset: Math.max(0, contentOffset.y),
        viewportHeight: layoutMeasurement.height,
      };
      saveCurrentScrollState();
    },
    [saveCurrentScrollState],
  );
  const loadOlderMessages = useCallback(async () => {
    if (sessionQuery.isLoadingOlder) return;
    prependAnchorRef.current = {
      contentHeight: scrollMetricsRef.current.contentHeight,
      offset: scrollMetricsRef.current.offset,
    };
    try {
      await sessionQuery.loadOlder();
    } catch (error: unknown) {
      prependAnchorRef.current = undefined;
      Alert.alert(
        "Could not load earlier messages",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }, [sessionQuery.isLoadingOlder, sessionQuery.loadOlder]);
  useEffect(
    () => () => {
      if (positioningFrameRef.current !== undefined) {
        cancelAnimationFrame(positioningFrameRef.current);
      }
      saveCurrentScrollState();
    },
    [saveCurrentScrollState],
  );
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      setIsTimelineKeyboardVisible(true);
      if (keyboardScrollTimerRef.current) {
        clearTimeout(keyboardScrollTimerRef.current);
      }
      keyboardScrollTimerRef.current = setTimeout(
        () => scrollToLatest(true),
        320,
      );
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setIsTimelineKeyboardVisible(false);
    });
    return () => {
      show.remove();
      hide.remove();
      if (keyboardScrollTimerRef.current) {
        clearTimeout(keyboardScrollTimerRef.current);
      }
    };
  }, [scrollToLatest]);
  useEffect(() => {
    if (!latestTurnId || !isTimelineKeyboardVisible) return;
    if (keyboardScrollTimerRef.current) {
      clearTimeout(keyboardScrollTimerRef.current);
    }
    keyboardScrollTimerRef.current = setTimeout(() => scrollToLatest(true), 80);
    return () => {
      if (keyboardScrollTimerRef.current) {
        clearTimeout(keyboardScrollTimerRef.current);
      }
    };
  }, [isTimelineKeyboardVisible, latestTurnId, scrollToLatest]);
  const renderTurn = useCallback(
    ({ item: turn }: { item: (typeof turns)[number] }) => (
      <OpencodeChatTurn
        isReverting={isReverting && revertingId === turn.id}
        isStreaming={turn.id === activeTurnId}
        item={turn}
        onRevert={onRevert}
        reserveBottomSpace={
          turn.id === latestTurnId &&
          !activeQuestion &&
          !isTimelineKeyboardVisible
        }
      />
    ),
    [
      activeQuestion,
      activeTurnId,
      isReverting,
      isTimelineKeyboardVisible,
      latestTurnId,
      onRevert,
      revertingId,
      turns,
    ],
  );
  if (!data) return null;
  return (
    <>
      <ChatRevertDisabledContext.Provider
        value={sessionQuery.isStreaming || isReverting || isRestoring}
      >
        <FlatList
          ref={listRef}
          accessibilityElementsHidden={!isPositioned}
          contentContainerStyle={[
            styles.messages,
            { paddingTop: topInset, paddingBottom: bottomInset },
          ]}
          data={turns}
          initialNumToRender={Math.max(1, turns.length)}
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
            ) : null
          }
          ListHeaderComponent={
            sessionQuery.hasOlderMessages ||
            (data.executionError && !hasInlineExecutionError) ? (
              <View style={styles.timelineHeader}>
                {sessionQuery.hasOlderMessages ? (
                  <Pressable
                    accessibilityLabel="Load earlier messages"
                    accessibilityRole="button"
                    disabled={sessionQuery.isLoadingOlder}
                    onPress={() => void loadOlderMessages()}
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
                ) : null}
                {data.executionError && !hasInlineExecutionError ? (
                  <View
                    accessibilityLiveRegion="assertive"
                    accessibilityRole="alert"
                    style={[
                      styles.executionError,
                      {
                        backgroundColor: "rgba(239,68,68,0.08)",
                        borderColor: "#ef4444",
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
                    <View style={styles.executionErrorBody}>
                      <ThemedText style={styles.executionErrorTitle}>
                        {data.executionError.title}
                        {data.executionError.statusCode
                          ? ` (${data.executionError.statusCode})`
                          : ""}
                      </ThemedText>
                      <ThemedText style={styles.executionErrorMessage}>
                        {data.executionError.message}
                      </ThemedText>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null
          }
          maxToRenderPerBatch={5}
          onContentSizeChange={handleTimelineContentSizeChange}
          onLayout={handleTimelineLayout}
          onScroll={handleTimelineScroll}
          pointerEvents={isPositioned ? "auto" : "none"}
          removeClippedSubviews={Platform.OS === "android"}
          renderItem={renderTurn}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          style={{ opacity: isPositioned ? 1 : 0 }}
          windowSize={5}
        />
      </ChatRevertDisabledContext.Provider>
    </>
  );
});

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
  chatArea: { flex: 1 },
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
  inputSolidBackground: {
    bottom: 0,
    height: PAGE_CHROME.bottom.estimatedInset,
    left: 0,
    position: "absolute",
    right: 0,
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
  timelineHeader: {
    gap: 12,
  },
  executionError: {
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  executionErrorBody: {
    flex: 1,
    gap: 4,
  },
  executionErrorTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  executionErrorMessage: {
    fontSize: 12,
    lineHeight: 18,
  },
  messages: {
    gap: 28,
    paddingBottom: 150,
    paddingHorizontal: 18,
    paddingTop: 24,
  },
  queuedPrompt: {
    fontSize: 12,
  },
  queuedPromptAction: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  queuedPromptDragHandle: { padding: 4 },
  queuedPromptInput: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  queuedPromptDragDot: {
    borderRadius: 1,
    height: 2,
    width: 2,
  },
  queuedPromptDragDots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    width: 8,
  },
  queuedPromptRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  queuedPrompts: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  queuedPromptsHeader: {
    alignItems: "center",
    flexDirection: "row",
  },
  queuedPromptsTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  queuedPromptsToggle: {
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
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
  disabled: { opacity: 0.4 },
});
