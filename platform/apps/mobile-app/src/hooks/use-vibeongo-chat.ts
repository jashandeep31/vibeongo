import { useQueryClient, useWebSocket } from "@repo/api-hooks";
import {
  useChatStore,
  type Chat,
  type ChatAnswerDelta,
  type ChatTurn,
  type PersistedChatTurn,
} from "@repo/app-store";
import { useCallback, useEffect } from "react";
import { Alert } from "react-native";

import type { VibeongoComposerPayload } from "@/components/chats/vibeongo-composer";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSocketError(data: unknown) {
  return isRecord(data) && typeof data.error === "string"
    ? data.error
    : "The chat request failed.";
}

export function useVibeongoChat(chatId: string) {
  const queryClient = useQueryClient();
  const { isConnected, sendJsonMessage, status, subscribeJsonMessage } =
    useWebSocket();
  const chat = useChatStore((state) => state.chat);
  const turns = useChatStore((state) => state.turns);
  const streamingTurn = useChatStore((state) => state.streamingTurn);
  const isLoading = useChatStore((state) => state.isLoading);
  const isNotFound = useChatStore((state) => state.isNotFound);
  const loadError = useChatStore((state) => state.loadError);
  const isSending = useChatStore((state) => state.isSending);
  const resetChat = useChatStore((state) => state.reset);
  const loadChat = useChatStore((state) => state.load);
  const markNotFound = useChatStore((state) => state.markNotFound);
  const markLoadError = useChatStore((state) => state.markLoadError);
  const setSending = useChatStore((state) => state.setSending);
  const startStreaming = useChatStore((state) => state.startStreaming);
  const appendAnswerDelta = useChatStore((state) => state.appendAnswerDelta);
  const finishTurn = useChatStore((state) => state.finishTurn);
  const clearStreaming = useChatStore((state) => state.clearStreaming);

  useEffect(() => {
    resetChat(chatId);
    return () => resetChat("");
  }, [chatId, resetChat]);

  useEffect(() => {
    const unsubscribe = subscribeJsonMessage((message) => {
      if (message.type === "chat-data") {
        if (!isRecord(message.data)) {
          markLoadError("The server returned an invalid chat response.");
          return;
        }

        const data = message.data as {
          chat?: Chat | null;
          chatQuestions?: PersistedChatTurn[];
        };
        if (!data.chat || data.chat.id !== chatId) {
          markNotFound();
          return;
        }

        loadChat(
          data.chat,
          Array.isArray(data.chatQuestions) ? data.chatQuestions : [],
        );
        return;
      }

      if (message.type === "stream-question-started") {
        if (!isRecord(message.data)) return;
        const turn = message.data as ChatTurn;
        if (turn.chat_id === chatId) startStreaming(turn);
        return;
      }

      if (message.type === "answer-delta") {
        if (!isRecord(message.data)) return;
        const delta = message.data as ChatAnswerDelta;
        if (delta.chatId === chatId) appendAnswerDelta(delta);
        return;
      }

      if (message.type === "new-question") {
        if (!isRecord(message.data)) return;
        const turn = message.data as ChatTurn;
        if (turn.chat_id !== chatId) return;
        finishTurn(turn);
        void queryClient.invalidateQueries({ queryKey: ["chats"] });
        return;
      }

      if (message.type === "error") {
        const errorMessage = getSocketError(message.data);
        if (!useChatStore.getState().chat) {
          markLoadError(errorMessage);
          return;
        }
        clearStreaming();
        Alert.alert("Chat request failed", errorMessage);
      }
    });

    if (isConnected) {
      const joined = sendJsonMessage({
        type: "join-chat",
        data: { id: chatId },
      });
      if (!joined) markLoadError("Could not connect to the chat server.");
    }

    return unsubscribe;
  }, [
    appendAnswerDelta,
    chatId,
    clearStreaming,
    finishTurn,
    isConnected,
    loadChat,
    markLoadError,
    markNotFound,
    queryClient,
    sendJsonMessage,
    startStreaming,
    subscribeJsonMessage,
  ]);

  const submitQuestion = useCallback(
    (payload: VibeongoComposerPayload) => {
      const state = useChatStore.getState();
      if (!isConnected || state.streamingTurn || state.isSending) return false;

      const sent = sendJsonMessage({
        type: "new-question",
        data: {
          chatId,
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

      setSending(true);
      return true;
    },
    [chatId, isConnected, sendJsonMessage, setSending],
  );

  return {
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
  };
}
