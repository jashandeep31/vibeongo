import type { OpencodePromptSelection } from "@repo/api-client";
import {
  useOpencodeInventory,
  useOpencodeSession,
  useSendOpencodePrompt,
} from "@repo/api-hooks";
import { useSessionChatsStore } from "@repo/app-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OpencodeComposer } from "@/components/projects/opencode-composer";
import { ProjectChatStatus } from "@/components/projects/project-chat-status";
import { NativeMarkdown } from "@/components/native-markdown";
import { ThemedText } from "@/components/themed-text";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";

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
  const params = useLocalSearchParams<{
    opencodeSessionId?: string | string[];
    projectId?: string | string[];
    projectSessionId?: string | string[];
  }>();
  const projectSessionId = firstParam(params.projectSessionId);
  const opencodeSessionId = firstParam(params.opencodeSessionId);
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
    if (!text || sendPrompt.isPending || sessionQuery.isStreaming) return;
    setPrompt("");
    sendPrompt.mutate(
      { text, files: [], selection },
      {
        onError: () => setPrompt(text),
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
    return text ? [{ id: message.info.id, role: message.info.role, text }] : [];
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
        <View
          style={[styles.header, { borderColor: theme.backgroundSelected }]}
        >
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
          <View style={styles.headerCopy}>
            <ThemedText numberOfLines={1} style={styles.headerTitle}>
              {data.session.title || "Untitled chat"}
            </ThemedText>
            <ThemedText
              style={styles.headerSubtitle}
              themeColor="textSecondary"
            >
              {sessionQuery.isStreaming ? "Vibeongo is working…" : "OpenCode"}
            </ThemedText>
          </View>
          {sessionQuery.isFetching && !sessionQuery.isStreaming ? (
            <ActivityIndicator size="small" />
          ) : null}
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
              {message.role === "user" ? (
                <ThemedText style={styles.messageText}>
                  {message.text}
                </ThemedText>
              ) : (
                <NativeMarkdown content={message.text} />
              )}
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
          style={[styles.composerOuter, { backgroundColor: theme.background }]}
        >
          <OpencodeComposer
            accessibilityLabel="Follow-up prompt"
            inventory={inventoryQuery.data}
            isSubmitting={sendPrompt.isPending}
            onChangeSelection={setSelection}
            onChangeText={setPrompt}
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
      </KeyboardAvoidingView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerCopy: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
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
