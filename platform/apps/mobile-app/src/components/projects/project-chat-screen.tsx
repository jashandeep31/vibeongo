import type { OpencodePromptSelection } from "@repo/api-client";
import {
  useOpencodeInventory,
  useOpencodeSession,
  useSendOpencodePrompt,
} from "@repo/api-hooks";
import { useSessionChatsStore } from "@repo/app-store";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
  OpencodeComposer,
  type ComposerImageAttachment,
} from "@/components/projects/opencode-composer";
import { ProjectChatStatus } from "@/components/projects/project-chat-status";
import {
  ProjectChatSwitcherDrawer,
  type ProjectChatTarget,
} from "@/components/projects/project-chat-switcher-drawer";
import { ProjectDomainsButton } from "@/components/projects/project-domains-drawer";
import { NativeMarkdown } from "@/components/native-markdown";
import { ThemedText } from "@/components/themed-text";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";

const EMPTY_SESSION_CHATS: Array<{ id: string }> = [];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function messageText(
  parts: Array<{ type: string; text?: string; ignored?: boolean }>,
) {
  return parts
    .flatMap((part) =>
      part.type === "text" && !part.ignored && part.text?.trim()
        ? [part.text]
        : [],
    )
    .join("\n\n");
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
  const data = sessionQuery.data;
  const [selection, setSelection] = useState<OpencodePromptSelection>({});

  useEffect(() => {
    const provider = data?.session.model?.providerID;
    const model = data?.session.model?.id;
    const inventory = inventoryQuery.data;
    setSelection((current) => ({
      ...current,
      model:
        current.model ??
        (provider && model ? `${provider}/${model}` : inventory?.models[0]?.id),
      variant: current.variant ?? data?.session.model?.variant,
      agent:
        current.agent ??
        data?.session.agent ??
        inventory?.agents.find((agent) => agent.mode === "primary")?.id ??
        inventory?.agents[0]?.id,
    }));
  }, [
    data?.session.agent,
    data?.session.model?.id,
    data?.session.model?.providerID,
    data?.session.model?.variant,
    inventoryQuery.data,
  ]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const openNewChat = () => {
    router.push({
      pathname: "/projects/[projectId]/sessions/[projectSessionId]/new-chat",
      params: {
        directory: data?.session.directory ?? "",
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
  }, [data?.messages.length, sessionQuery.isStreaming]);

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

  const visibleMessages = data.messages.flatMap((message) => {
    const text = messageText(message.parts);
    const images = message.parts.flatMap((part) =>
      part.type === "file" && part.mime?.startsWith("image/") && part.url
        ? [
            {
              id: part.id,
              name: part.filename ?? "Attached image",
              url: part.url,
            },
          ]
        : [],
    );
    return text || images.length
      ? [{ id: message.info.id, role: message.info.role, text, images }]
      : [];
  });

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
            {visibleMessages.map((message) => (
              <View
                key={message.id}
                style={
                  message.role === "user"
                    ? [
                        styles.userMessage,
                        { backgroundColor: theme.backgroundElement },
                      ]
                    : styles.assistantMessage
                }
              >
                {message.images.length ? (
                  <View style={styles.messageImages}>
                    {message.images.map((image) => (
                      <Image
                        accessibilityLabel={image.name}
                        contentFit="cover"
                        key={image.id}
                        source={{ uri: image.url }}
                        style={styles.messageImage}
                      />
                    ))}
                  </View>
                ) : null}
                {message.role === "user" ? (
                  message.text ? (
                    <ThemedText style={styles.messageText}>
                      {message.text}
                    </ThemedText>
                  ) : null
                ) : message.text ? (
                  <NativeMarkdown content={message.text} />
                ) : null}
              </View>
            ))}
            {sessionQuery.isStreaming ? (
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
            <OpencodeComposer
              accessibilityLabel="Follow-up prompt"
              attachments={attachments}
              inventory={inventoryQuery.data}
              isSubmitting={sendPrompt.isPending}
              onChangeSelection={setSelection}
              onChangeAttachments={setAttachments}
              onChangeText={setPrompt}
              onNewChat={openNewChat}
              onSubmit={submit}
              placeholder={
                sessionQuery.isStreaming
                  ? "Write your next message…"
                  : "Ask a follow-up…"
              }
              selection={selection}
              submitDisabled={sessionQuery.isStreaming}
              value={prompt}
            />
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
        onSelect={selectChat}
        visible={isChatSwitcherOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  assistantMessage: {
    alignSelf: "stretch",
  },
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
  messageText: {
    fontSize: 15,
    lineHeight: 23,
  },
  messageImage: {
    borderRadius: 12,
    height: 112,
    width: 112,
  },
  messageImages: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
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
  userMessage: {
    alignSelf: "flex-end",
    borderRadius: 16,
    maxWidth: "88%",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
