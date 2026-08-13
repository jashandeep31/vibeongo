import type { Chat } from "@repo/api-client";
import {
  useDeleteChat,
  useGetVibeongoChats,
  useWebSocket,
} from "@repo/api-hooks";
import { SymbolView } from "expo-symbols";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import {
  VibeongoComposer,
  type VibeongoComposerPayload,
} from "@/components/chats/vibeongo-composer";
import { ConfirmationDrawer } from "@/components/confirmation-drawer";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

function getSocketError(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }
  return "Could not create the chat. Please try again.";
}

export function ChatList() {
  const theme = useTheme();
  const router = useRouter();
  const {
    data: chats = [],
    isError,
    isPending,
    isRefetching,
    refetch,
  } = useGetVibeongoChats();
  const deleteChat = useDeleteChat();
  const { isConnected, sendJsonMessage, status, subscribeJsonMessage } =
    useWebSocket();
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const isCreatingChatRef = useRef(false);

  const setCreating = useCallback((creating: boolean) => {
    isCreatingChatRef.current = creating;
    setIsCreatingChat(creating);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  useEffect(
    () =>
      subscribeJsonMessage((message) => {
        if (
          message.type === "new-chat" &&
          typeof message.data === "object" &&
          message.data !== null &&
          "chatId" in message.data &&
          typeof message.data.chatId === "string"
        ) {
          if (!isCreatingChatRef.current) return;
          const chatId = message.data.chatId;
          setCreating(false);
          router.push({ pathname: "/chats/[chatId]", params: { chatId } });
          return;
        }

        if (message.type === "error" && isCreatingChatRef.current) {
          setCreating(false);
          Alert.alert("Could not create chat", getSocketError(message.data));
        }
      }),
    [router, setCreating, subscribeJsonMessage],
  );

  useEffect(() => {
    if (status === "connected" || !isCreatingChatRef.current) return;
    setCreating(false);
    Alert.alert(
      "Connection interrupted",
      "The chat was not created. Wait for the connection and try again.",
    );
  }, [setCreating, status]);

  const createChat = (payload: VibeongoComposerPayload) => {
    if (!payload.message.trim() || isCreatingChatRef.current) return false;

    const sent = sendJsonMessage({
      type: "new-chat",
      data: {
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
      Alert.alert(
        "Still connecting",
        "Wait for the chat service to connect and try again.",
      );
      return false;
    }

    setCreating(true);
    return true;
  };

  const confirmDelete = () => {
    if (!chatToDelete || deleteChat.isPending) return;
    deleteChat.mutate(chatToDelete.id, {
      onError: (error) => {
        Alert.alert("Could not delete chat", error.message);
      },
      onSuccess: () => setChatToDelete(null),
    });
  };

  const renderChat = ({ item }: { item: Chat }) => {
    const isDeleting = deleteChat.isPending && deleteChat.variables === item.id;

    return (
      <View style={styles.rowWrap}>
        <Pressable
          accessibilityLabel={`Open ${item.name}`}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/chats/[chatId]",
              params: { chatId: item.id },
            })
          }
          style={({ pressed }) => [
            styles.row,
            pressed && { backgroundColor: theme.backgroundElement },
          ]}
        >
          <SymbolView
            name={{ ios: "message", android: "chat_bubble_outline" }}
            size={20}
            tintColor={theme.textSecondary}
          />
          <ThemedText numberOfLines={1} style={styles.name}>
            {item.name}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityLabel={`Delete ${item.name}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: deleteChat.isPending }}
          disabled={deleteChat.isPending}
          hitSlop={4}
          onPress={() => setChatToDelete(item)}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.pressed,
          ]}
        >
          {isDeleting ? (
            <ActivityIndicator color={theme.textSecondary} size="small" />
          ) : (
            <SymbolView
              name={{ ios: "xmark", android: "close" }}
              size={18}
              tintColor={
                deleteChat.isPending
                  ? theme.backgroundSelected
                  : theme.textSecondary
              }
            />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <FlatList
        contentContainerStyle={styles.content}
        data={isError ? [] : chats}
        ItemSeparatorComponent={() => (
          <View
            style={[
              styles.separator,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
        )}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(chat) => chat.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isPending ? (
              <>
                <ActivityIndicator />
                <ThemedText themeColor="textSecondary">
                  Loading chats…
                </ThemedText>
              </>
            ) : isError ? (
              <>
                <ThemedText themeColor="textSecondary">
                  Could not load chats.
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void refetch()}
                  style={({ pressed }) => [
                    styles.retryButton,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.retryLabel}>Retry</ThemedText>
                </Pressable>
              </>
            ) : (
              <ThemedText themeColor="textSecondary">
                No chats yet. Start one above.
              </ThemedText>
            )}
          </View>
        }
        onRefresh={() => void refetch()}
        refreshing={isRefetching && !isPending}
        renderItem={renderChat}
        showsVerticalScrollIndicator={false}
      />

      <View
        style={[styles.composerDock, { backgroundColor: theme.background }]}
      >
        <VibeongoComposer
          disabled={!isConnected}
          isSubmitting={isCreatingChat}
          onSubmit={createChat}
          placeholder="Message VibeOnGo"
          variant="compact"
        />
      </View>

      <ConfirmationDrawer
        confirmLabel="Delete chat"
        description={
          chatToDelete
            ? `Delete “${chatToDelete.name}”? This cannot be undone.`
            : "This cannot be undone."
        }
        isConfirming={deleteChat.isPending}
        onCancel={() => {
          if (!deleteChat.isPending) setChatToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete chat?"
        visible={chatToDelete !== null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  composerDock: {
    paddingBottom: 6,
    paddingTop: 6,
  },
  deleteButton: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 52,
  },
  name: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.7,
  },
  retryButton: {
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  root: {
    flex: 1,
  },
  row: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    gap: 13,
    minHeight: 56,
    paddingHorizontal: 8,
  },
  rowWrap: {
    alignItems: "center",
    flexDirection: "row",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 41,
  },
});
