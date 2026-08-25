import type { ChatTurn } from "@repo/app-store";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AccessibilityInfo,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { VibeongoChatTurn } from "@/components/chats/vibeongo-chat-turn";
import { VibeongoComposer } from "@/components/chats/vibeongo-composer";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { useVibeongoChat } from "@/hooks/use-vibeongo-chat";

const TOP_FADE_HEIGHT = 14;
const BOTTOM_FADE_HEIGHT = 10;

export function VibeongoChatScreen({ chatId }: { chatId: string }) {
  const theme = useTheme();
  const router = useRouter();
  const listRef = useRef<FlatList<ChatTurn>>(null);
  const shouldStickToBottomRef = useRef(true);
  const wasStreamingRef = useRef(false);
  const [bottomChromeHeight, setBottomChromeHeight] = useState(82);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [topChromeHeight, setTopChromeHeight] = useState(74);
  const {
    chat,
    isConnected,
    isLoading,
    isNotFound,
    isSending,
    loadError,
    status,
    streamingTurn,
    submitQuestion,
    turns,
  } = useVibeongoChat(chatId);
  const visibleTurns = streamingTurn ? [...turns, streamingTurn] : turns;

  useEffect(() => {
    const isStreamingNow = streamingTurn !== null;
    if (wasStreamingRef.current && !isStreamingNow) {
      AccessibilityInfo.announceForAccessibility("Response complete");
    }
    wasStreamingRef.current = isStreamingNow;
  }, [streamingTurn]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace({ pathname: "/", params: { view: "chats" } });
  };

  const scrollToBottom = (animated = false) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
      shouldStickToBottomRef.current = true;
      setShowScrollButton(false);
    });
  };

  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    scrollToBottom(false);
  }, [streamingTurn?.answer?.answer.length, turns.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height;
    shouldStickToBottomRef.current = distanceFromBottom <= 120;
    setShowScrollButton(distanceFromBottom > 100);
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.stateScreen, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator />
        <ThemedText themeColor="textSecondary">
          {status === "connected" ? "Loading chat…" : "Connecting to chat…"}
        </ThemedText>
      </SafeAreaView>
    );
  }

  if (isNotFound || !chat) {
    return (
      <SafeAreaView
        style={[styles.stateScreen, { backgroundColor: theme.background }]}
      >
        <View
          style={[
            styles.stateIcon,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          <SymbolView
            name={{ ios: "message", android: "speaker_notes_off" }}
            size={21}
            tintColor={theme.textSecondary}
          />
        </View>
        <ThemedText style={styles.stateTitle}>
          {loadError ? "Could not load chat" : "Chat not found"}
        </ThemedText>
        <ThemedText style={styles.stateDescription} themeColor="textSecondary">
          {loadError ??
            "This chat does not exist or you do not have access to it."}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={goBack}
          style={({ pressed }) => [
            styles.backToChats,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.backToChatsLabel}>Back to chats</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isStreaming = streamingTurn !== null;
  const placeholder = !isConnected
    ? "Reconnecting…"
    : isStreaming
      ? "Write your next prompt…"
      : "Ask a follow-up question";

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled
        style={styles.screen}
      >
        <View style={styles.screen}>
          <View style={styles.body}>
            <FlatList
              contentContainerStyle={[
                styles.messages,
                {
                  paddingBottom: bottomChromeHeight,
                  paddingTop: topChromeHeight,
                },
              ]}
              data={visibleTurns}
              keyExtractor={(turn) => turn.id}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => {
                if (shouldStickToBottomRef.current) scrollToBottom(false);
              }}
              onScroll={handleScroll}
              ref={listRef}
              renderItem={({ item }) => (
                <VibeongoChatTurn
                  isStreaming={streamingTurn?.id === item.id}
                  turn={item}
                />
              )}
              scrollEventThrottle={16}
              scrollIndicatorInsets={{
                bottom: bottomChromeHeight,
                top: topChromeHeight,
              }}
              showsVerticalScrollIndicator={false}
            />

            {showScrollButton ? (
              <Pressable
                accessibilityLabel="Scroll to latest message"
                accessibilityRole="button"
                onPress={() => scrollToBottom(true)}
                style={({ pressed }) => [
                  styles.scrollButton,
                  {
                    backgroundColor: theme.text,
                    borderColor: theme.backgroundSelected,
                    bottom: bottomChromeHeight + 10,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: "arrow.down", android: "arrow_downward" }}
                  size={18}
                  tintColor={theme.background}
                />
              </Pressable>
            ) : null}
          </View>

          <View
            onLayout={(event) =>
              setTopChromeHeight(event.nativeEvent.layout.height)
            }
            pointerEvents="box-none"
            style={styles.topChrome}
          >
            <LinearGradient
              colors={[
                `${theme.background}F2`,
                `${theme.background}80`,
                `${theme.background}00`,
              ]}
              dither
              end={{ x: 0.5, y: 1 }}
              locations={[0, 0.7, 1]}
              pointerEvents="none"
              start={{ x: 0.5, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
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
              <View
                style={[
                  styles.headerTitleWrap,
                  { backgroundColor: theme.backgroundElement },
                ]}
              >
                <ThemedText numberOfLines={1} style={styles.headerTitle}>
                  {chat.name || "Untitled chat"}
                </ThemedText>
              </View>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          <View
            onLayout={(event) =>
              setBottomChromeHeight(event.nativeEvent.layout.height)
            }
            pointerEvents="box-none"
            style={styles.bottomChrome}
          >
            <LinearGradient
              colors={[
                `${theme.background}00`,
                `${theme.background}80`,
                `${theme.background}F2`,
              ]}
              dither
              end={{ x: 0.5, y: 1 }}
              locations={[0, 0.3, 1]}
              pointerEvents="none"
              start={{ x: 0.5, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.composerOuter}>
              <VibeongoComposer
                disabled={!isConnected}
                isSubmitting={isSending}
                onSubmit={submitQuestion}
                placeholder={placeholder}
                submitDisabled={isStreaming}
                variant="compact"
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backToChats: {
    borderRadius: 10,
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backToChatsLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  body: {
    flex: 1,
    position: "relative",
  },
  bottomChrome: {
    bottom: 0,
    left: 0,
    paddingTop: BOTTOM_FADE_HEIGHT,
    position: "absolute",
    right: 0,
    zIndex: 3,
  },
  composerOuter: {
    gap: 6,
    paddingBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  headerButton: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  headerTitleWrap: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  headerSpacer: {
    height: 44,
    width: 44,
  },
  messages: {
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  pressed: {
    opacity: 0.72,
  },
  screen: {
    flex: 1,
  },
  scrollButton: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 18,
    width: 44,
  },
  stateDescription: {
    lineHeight: 21,
    maxWidth: 340,
    textAlign: "center",
  },
  stateIcon: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    marginBottom: 2,
    width: 48,
  },
  stateScreen: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  topChrome: {
    left: 0,
    paddingBottom: TOP_FADE_HEIGHT,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 3,
  },
});
