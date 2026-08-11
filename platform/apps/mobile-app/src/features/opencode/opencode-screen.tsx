import { BlurTargetView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { FloatingScreenHeader } from "@/components/floating-screen-header";
import { NativeMarkdown } from "@/components/native-markdown";
import {
  Radius,
  Spacing,
  TouchTarget,
  type AppColors,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import type { RuntimeInstance } from "@/features/home/types";

import {
  answerOpencodeQuestion,
  createOpencodeChat,
  getOpencodeChats,
  getOpencodeChatState,
  getOpencodeInventory,
  getOpencodeSession,
  getRunningSessionInstance,
  rejectOpencodeQuestion,
  replyOpencodePermission,
  sendOpencodeMessage,
  type OpencodeChatOption,
  type OpencodeInventory,
  type OpencodeMessage,
  type OpencodePermission,
  type OpencodePromptSelection,
  type OpencodeQuestion,
} from "./opencode-api";
import { OpencodeChatSwitcher } from "./opencode-chat-switcher";
import {
  OpencodePermissionPrompt,
  OpencodeQuestionPrompt,
} from "./opencode-question-prompt";
import { ProjectDomainsButton } from "./project-domains-sheet";
import { PromptSelectors } from "./prompt-selectors";
import { OpencodeToolCard } from "./opencode-tool-card";

function messageText(message: OpencodeMessage) {
  return message.parts
    .filter(
      (part) =>
        part.type === "text" && !part.ignored && typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("\n\n")
    .trim();
}

export function OpencodeScreen() {
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    projectId?: string;
    projectSessionId: string;
    projectName?: string;
    sessionName?: string;
    directory?: string;
    opencodeSessionId?: string;
    opencodeSessionTitle?: string;
  }>();
  const scrollRef = useRef<ScrollView>(null);
  const blurTargetRef = useRef<View>(null);
  const [instance, setInstance] = useState<RuntimeInstance | null>(null);
  const [sessionId, setSessionId] = useState(params.opencodeSessionId ?? "");
  const [messages, setMessages] = useState<OpencodeMessage[]>([]);
  const [chats, setChats] = useState<OpencodeChatOption[]>([]);
  const [isChatSwitcherOpen, setIsChatSwitcherOpen] = useState(false);
  const [questions, setQuestions] = useState<OpencodeQuestion[]>([]);
  const [permissions, setPermissions] = useState<OpencodePermission[]>([]);
  const [inventory, setInventory] = useState<OpencodeInventory | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [selection, setSelection] = useState<OpencodePromptSelection>({});
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const directory = params.directory ?? "";

  const loadInventory = useCallback(
    async (activeInstance: RuntimeInstance) => {
      if (!directory) return;
      setInventoryError(null);
      try {
        const nextInventory = await getOpencodeInventory(
          activeInstance,
          directory,
        );
        setInventory(nextInventory);
        setSelection((current) => ({
          model: current.model ?? nextInventory.models[0]?.id,
          variant: current.variant,
          agent: current.agent ?? nextInventory.agents[0]?.id,
        }));
      } catch (inventoryLoadError) {
        setInventory({ models: [], agents: [] });
        setInventoryError(
          inventoryLoadError instanceof Error
            ? inventoryLoadError.message
            : "Could not load models and agents.",
        );
      }
    },
    [directory],
  );

  const loadChats = useCallback(
    async (activeInstance: RuntimeInstance) => {
      if (!directory) return;
      try {
        setChats(await getOpencodeChats(activeInstance, directory));
      } catch {
        // The active chat remains usable if the surrounding chat list fails.
      }
    },
    [directory],
  );

  const refresh = useCallback(async () => {
    if (!instance || !sessionId || !directory) return;
    const next = await getOpencodeChatState(instance, sessionId, directory);
    setMessages(next.messages);
    setQuestions(next.questions);
    setPermissions(next.permissions);
    setIsSending(
      next.status.type === "busy" &&
        next.questions.length === 0 &&
        next.permissions.length === 0,
    );
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: false }),
    );
  }, [directory, instance, sessionId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setSessionId(params.opencodeSessionId ?? "");
    setMessages([]);
    setQuestions([]);
    setPermissions([]);
    getRunningSessionInstance(params.projectSessionId)
      .then(async (nextInstance) => {
        if (cancelled) return;
        setInstance(nextInstance);
        void loadInventory(nextInstance);
        void loadChats(nextInstance);
        if (params.opencodeSessionId && directory) {
          const [nextChatState, activeSession] = await Promise.all([
            getOpencodeChatState(
              nextInstance,
              params.opencodeSessionId,
              directory,
            ),
            getOpencodeSession(
              nextInstance,
              params.opencodeSessionId,
              directory,
            ),
          ]);
          if (!cancelled) {
            setMessages(nextChatState.messages);
            setQuestions(nextChatState.questions);
            setPermissions(nextChatState.permissions);
            setIsSending(
              nextChatState.status.type === "busy" &&
                nextChatState.questions.length === 0 &&
                nextChatState.permissions.length === 0,
            );
            setSelection((current) => ({
              model: activeSession.model
                ? `${activeSession.model.providerID}/${activeSession.model.id}`
                : current.model,
              variant: activeSession.model?.variant ?? current.variant,
              agent: activeSession.agent ?? current.agent,
            }));
          }
        }
      })
      .catch((loadError) => {
        if (!cancelled)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not connect to OpenCode.",
          );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    directory,
    loadChats,
    loadInventory,
    params.opencodeSessionId,
    params.projectSessionId,
  ]);

  useEffect(() => {
    if (!instance || !sessionId || !directory || !isSending) return;
    const interval = setInterval(
      () => void refresh().catch(() => undefined),
      1500,
    );
    return () => clearInterval(interval);
  }, [directory, instance, isSending, refresh, sessionId]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || !instance || !directory || isSending) return;
    setIsSending(true);
    setDraft("");
    try {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const created = await createOpencodeChat(instance, directory);
        activeSessionId = created.id;
        setSessionId(created.id);
        setChats((current) => [
          {
            id: created.id,
            title: created.title ?? "New chat",
            directory,
            time: { updated: Date.now() },
          },
          ...current.filter((chat) => chat.id !== created.id),
        ]);
        router.setParams({
          opencodeSessionId: created.id,
          opencodeSessionTitle: created.title ?? "New chat",
        });
      }
      await sendOpencodeMessage(
        instance,
        activeSessionId,
        directory,
        text,
        selection,
      );
      setTimeout(() => {
        void getOpencodeChatState(instance, activeSessionId, directory).then(
          (next) => {
            setMessages(next.messages);
            setQuestions(next.questions);
            setPermissions(next.permissions);
            setIsSending(
              next.status.type === "busy" &&
                next.questions.length === 0 &&
                next.permissions.length === 0,
            );
          },
        );
      }, 600);
    } catch (sendError) {
      setDraft(text);
      setIsSending(false);
      Alert.alert(
        "Could not send message",
        sendError instanceof Error ? sendError.message : "Please try again.",
      );
    }
  };

  const submitQuestionAnswers = async (answers: string[][]) => {
    const question = questions[0];
    if (!question || !instance || !directory || isResponding) return;
    setIsResponding(true);
    try {
      await answerOpencodeQuestion(instance, question.id, directory, answers);
      setQuestions((current) =>
        current.filter((item) => item.id !== question.id),
      );
      setIsSending(true);
      setTimeout(() => void refresh(), 400);
    } catch (questionError) {
      Alert.alert(
        "Could not submit answer",
        questionError instanceof Error
          ? questionError.message
          : "Please try again.",
      );
    } finally {
      setIsResponding(false);
    }
  };

  const dismissQuestion = async () => {
    const question = questions[0];
    if (!question || !instance || !directory || isResponding) return;
    setIsResponding(true);
    try {
      await rejectOpencodeQuestion(instance, question.id, directory);
      setQuestions((current) =>
        current.filter((item) => item.id !== question.id),
      );
      setTimeout(() => void refresh(), 400);
    } catch (questionError) {
      Alert.alert(
        "Could not dismiss question",
        questionError instanceof Error
          ? questionError.message
          : "Please try again.",
      );
    } finally {
      setIsResponding(false);
    }
  };

  const respondToPermission = async (reply: "once" | "always" | "reject") => {
    const permission = permissions[0];
    if (!permission || !instance || !directory || isResponding) return;
    setIsResponding(true);
    try {
      await replyOpencodePermission(instance, permission.id, directory, reply);
      setPermissions((current) =>
        current.filter((item) => item.id !== permission.id),
      );
      if (reply !== "reject") setIsSending(true);
      setTimeout(() => void refresh(), 400);
    } catch (permissionError) {
      Alert.alert(
        "Could not update permission",
        permissionError instanceof Error
          ? permissionError.message
          : "Please try again.",
      );
    } finally {
      setIsResponding(false);
    }
  };

  const switchChat = (chat: OpencodeChatOption) => {
    if (chat.id === sessionId) {
      setIsChatSwitcherOpen(false);
      return;
    }
    setIsChatSwitcherOpen(false);
    setSessionId(chat.id);
    setIsSending(false);
    setMessages([]);
    setQuestions([]);
    setPermissions([]);
    router.setParams({
      directory: chat.directory ?? directory,
      opencodeSessionId: chat.id,
      opencodeSessionTitle: chat.title?.trim() || "Untitled chat",
    });
  };

  const switchRelativeChat = (offset: -1 | 1) => {
    if (chats.length < 2) return;
    const currentIndex = chats.findIndex((chat) => chat.id === sessionId);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextChat = chats[(baseIndex + offset + chats.length) % chats.length];
    if (nextChat) switchChat(nextChat);
  };

  const currentChat = chats.find((chat) => chat.id === sessionId);
  const currentChatTitle =
    currentChat?.title?.trim() ||
    params.opencodeSessionTitle?.trim() ||
    (sessionId ? "Untitled chat" : "New chat");

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <SafeAreaView edges={["top", "bottom"]} style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <BlurTargetView ref={blurTargetRef} style={styles.flex}>
            {isLoading ? (
              <Status colors={colors} copy="Connecting to OpenCode…" />
            ) : error || !instance || !directory ? (
              <Status
                colors={colors}
                copy={error ?? "No repository directory was selected."}
              />
            ) : !sessionId ? (
              <View style={styles.newChat}>
                <Text style={[styles.newChatTitle, { color: colors.text }]}>
                  New chat
                </Text>
                <Text
                  style={[styles.newChatCopy, { color: colors.textSecondary }]}
                >
                  Send a message to start an OpenCode conversation in{" "}
                  {directory.split("/").at(-1)}.
                </Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.messages}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                style={styles.messageScroller}
              >
                {messages.map((message) => {
                  const text = messageText(message);
                  const user = message.info.role === "user";
                  const assistantParts = message.parts.filter(
                    (part) =>
                      (part.type === "text" &&
                        !part.ignored &&
                        Boolean(part.text?.trim())) ||
                      (part.type === "tool" &&
                        !(
                          part.tool === "question" &&
                          (part.state?.status === "pending" ||
                            part.state?.status === "running")
                        )),
                  );
                  if (user && !text) return null;
                  if (!user && assistantParts.length === 0) return null;
                  return (
                    <View
                      key={message.info.id}
                      style={[styles.message, user && styles.userMessage]}
                    >
                      {user ? (
                        <View
                          style={[
                            styles.userBubble,
                            {
                              backgroundColor: colors.backgroundElement,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            selectable
                            style={[styles.userText, { color: colors.text }]}
                          >
                            {text}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.assistantContent}>
                          {assistantParts.map((part, index) =>
                            part.type === "text" && part.text ? (
                              <NativeMarkdown
                                colors={colors}
                                content={part.text}
                                key={
                                  part.id ?? `${message.info.id}-text-${index}`
                                }
                              />
                            ) : part.type === "tool" ? (
                              <OpencodeToolCard
                                colors={colors}
                                key={
                                  part.id ?? `${message.info.id}-tool-${index}`
                                }
                                part={part}
                              />
                            ) : null,
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
                {isSending ? (
                  <View style={styles.thinking}>
                    <ActivityIndicator
                      color={colors.textSecondary}
                      size="small"
                    />
                    <Text
                      style={[styles.subtitle, { color: colors.textSecondary }]}
                    >
                      OpenCode is working…
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            )}

            {!isLoading && !error && instance && directory ? (
              <View style={styles.composerArea}>
                {questions[0] ? (
                  <OpencodeQuestionPrompt
                    busy={isResponding}
                    colors={colors}
                    onDismiss={() => void dismissQuestion()}
                    onSubmit={(answers) => void submitQuestionAnswers(answers)}
                    request={questions[0]}
                  />
                ) : permissions[0] ? (
                  <OpencodePermissionPrompt
                    busy={isResponding}
                    colors={colors}
                    onReply={(reply) => void respondToPermission(reply)}
                    request={permissions[0]}
                  />
                ) : (
                  <>
                    <PromptSelectors
                      colors={colors}
                      disabled={isSending}
                      inventory={inventory}
                      onChange={setSelection}
                      selection={selection}
                    />
                    {inventoryError ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void loadInventory(instance)}
                      >
                        <Text
                          style={[
                            styles.inventoryError,
                            { color: colors.destructive },
                          ]}
                        >
                          Could not load selectors. Tap to retry.
                        </Text>
                      </Pressable>
                    ) : null}
                    <View
                      style={[
                        styles.composer,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <TextInput
                        editable={!isSending}
                        multiline
                        onChangeText={setDraft}
                        placeholder={
                          sessionId
                            ? "Ask a follow-up"
                            : "What should OpenCode work on?"
                        }
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.input, { color: colors.text }]}
                        value={draft}
                      />
                      <Pressable
                        accessibilityLabel="Send"
                        accessibilityRole="button"
                        disabled={!draft.trim() || isSending}
                        onPress={() => void submit()}
                        style={[
                          styles.send,
                          { backgroundColor: colors.primary },
                          (!draft.trim() || isSending) && styles.disabled,
                        ]}
                      >
                        {isSending ? (
                          <ActivityIndicator
                            color={colors.primaryForeground}
                            size="small"
                          />
                        ) : (
                          <AppIcon
                            name={{
                              ios: "arrow.up",
                              android: "arrow_upward",
                              web: "arrow_upward",
                            }}
                            size={20}
                            tintColor={colors.primaryForeground}
                          />
                        )}
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            ) : null}
          </BlurTargetView>

          <FloatingScreenHeader
            actions={
              <>
                {instance && params.projectId ? (
                  <ProjectDomainsButton
                    colors={colors}
                    instanceId={instance.id}
                    projectId={params.projectId}
                  />
                ) : null}
                <Pressable
                  accessibilityLabel="Refresh"
                  accessibilityRole="button"
                  disabled={!sessionId}
                  onPress={() => void refresh()}
                  style={styles.iconButton}
                >
                  <AppIcon
                    name={{
                      ios: "arrow.clockwise",
                      android: "refresh",
                      web: "refresh",
                    }}
                    size={19}
                    tintColor={colors.textSecondary}
                  />
                </Pressable>
              </>
            }
            blurTarget={blurTargetRef}
            colors={colors}
            colorScheme={colorScheme}
            onBack={() => router.back()}
            onSwipeLeft={
              chats.length > 1 ? () => switchRelativeChat(1) : undefined
            }
            onSwipeRight={
              chats.length > 1 ? () => switchRelativeChat(-1) : undefined
            }
            onTitlePress={
              chats.length ? () => setIsChatSwitcherOpen(true) : undefined
            }
            title={currentChatTitle}
            wideTitle
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
      <OpencodeChatSwitcher
        chats={chats}
        colors={colors}
        currentId={sessionId}
        onClose={() => setIsChatSwitcherOpen(false)}
        onSelect={switchChat}
        visible={isChatSwitcherOpen}
      />
    </View>
  );
}

function Status({ colors, copy }: { colors: AppColors; copy: string }) {
  return (
    <View style={styles.status}>
      <ActivityIndicator color={colors.brand} />
      <Text style={[styles.statusText, { color: colors.textSecondary }]}>
        {copy}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  iconButton: {
    alignItems: "center",
    height: TouchTarget,
    justifyContent: "center",
    width: TouchTarget,
  },
  subtitle: { fontSize: 11, marginTop: 2 },
  status: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.three,
    justifyContent: "center",
    padding: Spacing.six,
  },
  statusText: { fontSize: 14, textAlign: "center" },
  newChat: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.seven,
  },
  newChatTitle: { fontSize: 26, fontWeight: "700" },
  newChatCopy: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.three,
    textAlign: "center",
  },
  messages: {
    flexGrow: 1,
    gap: Spacing.six,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.ten,
  },
  messageScroller: { flex: 1 },
  message: { maxWidth: "100%" },
  assistantContent: { gap: Spacing.three, width: "100%" },
  userMessage: { alignItems: "flex-end" },
  userBubble: {
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "88%",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  userText: { fontSize: 15, lineHeight: 21 },
  thinking: { alignItems: "center", flexDirection: "row", gap: Spacing.two },
  composerArea: { gap: Spacing.two, paddingTop: Spacing.two },
  inventoryError: {
    fontSize: 11,
    paddingHorizontal: Spacing.four,
    textAlign: "center",
  },
  composer: {
    alignItems: "flex-end",
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.two,
    marginBottom: Spacing.three,
    marginHorizontal: Spacing.three,
    padding: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 130,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  send: {
    alignItems: "center",
    borderRadius: Radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  disabled: { opacity: 0.4 },
});
