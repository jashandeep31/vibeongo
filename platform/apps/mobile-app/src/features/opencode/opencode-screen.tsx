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
  createOpencodeChat,
  getOpencodeMessages,
  getRunningSessionInstance,
  sendOpencodeMessage,
  type OpencodeMessage,
} from "./opencode-api";
import { ProjectDomainsButton } from "./project-domains-sheet";

function messageText(message: OpencodeMessage) {
  return message.parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
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
  }>();
  const scrollRef = useRef<ScrollView>(null);
  const [instance, setInstance] = useState<RuntimeInstance | null>(null);
  const [sessionId, setSessionId] = useState(params.opencodeSessionId ?? "");
  const [messages, setMessages] = useState<OpencodeMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const directory = params.directory ?? "";

  const refresh = useCallback(async () => {
    if (!instance || !sessionId || !directory) return;
    const next = await getOpencodeMessages(instance, sessionId, directory);
    setMessages(next);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: false }),
    );
  }, [directory, instance, sessionId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getRunningSessionInstance(params.projectSessionId)
      .then(async (nextInstance) => {
        if (cancelled) return;
        setInstance(nextInstance);
        if (params.opencodeSessionId && directory) {
          const nextMessages = await getOpencodeMessages(
            nextInstance,
            params.opencodeSessionId,
            directory,
          );
          if (!cancelled) setMessages(nextMessages);
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
  }, [directory, params.opencodeSessionId, params.projectSessionId]);

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
        router.setParams({ opencodeSessionId: created.id });
      }
      await sendOpencodeMessage(instance, activeSessionId, directory, text);
      await getOpencodeMessages(instance, activeSessionId, directory).then(
        setMessages,
      );
      setTimeout(() => {
        void getOpencodeMessages(instance, activeSessionId, directory)
          .then(setMessages)
          .finally(() => setIsSending(false));
      }, 2500);
    } catch (sendError) {
      setDraft(text);
      setIsSending(false);
      Alert.alert(
        "Could not send message",
        sendError instanceof Error ? sendError.message : "Please try again.",
      );
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <SafeAreaView edges={["top", "bottom"]} style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.iconButton}
            >
              <AppIcon
                name={{
                  ios: "chevron.left",
                  android: "arrow_back",
                  web: "arrow_back",
                }}
                size={20}
                tintColor={colors.text}
              />
            </Pressable>
            <View style={styles.headerText}>
              <Text
                numberOfLines={1}
                style={[styles.title, { color: colors.text }]}
              >
                {params.sessionName ?? "Project session"}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.subtitle, { color: colors.textSecondary }]}
              >
                {params.projectName ?? "OpenCode"}
              </Text>
            </View>
            <View style={styles.headerActions}>
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
            </View>
          </View>

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
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((message) => {
                const text = messageText(message);
                if (!text) return null;
                const user = message.info.role === "user";
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
                      <NativeMarkdown colors={colors} content={text} />
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
            <View
              style={[
                styles.composer,
                { backgroundColor: colors.surface, borderColor: colors.border },
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
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 62,
    paddingHorizontal: Spacing.two,
  },
  iconButton: {
    alignItems: "center",
    height: TouchTarget,
    justifyContent: "center",
    width: TouchTarget,
  },
  headerText: { alignItems: "center", flex: 1, minWidth: 0 },
  headerActions: { alignItems: "center", flexDirection: "row" },
  title: { fontSize: 15, fontWeight: "700" },
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
  messages: { flexGrow: 1, gap: Spacing.six, padding: Spacing.five },
  message: { maxWidth: "100%" },
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
  composer: {
    alignItems: "flex-end",
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.two,
    margin: Spacing.three,
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
