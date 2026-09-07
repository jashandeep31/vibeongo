"use client";

import {
  abortOpencodeSession,
  answerOpencodeQuestion,
  getOpencodeInventory,
  getOpencodeSessionMessages,
  getOpencodeSessionRaw,
  rejectOpencodeQuestion,
  revertOpencodeSession,
  sendOpencodePrompt,
  unrevertOpencodeSession,
  type OpencodeSessionData,
  type OpencodePromptSelection,
  type OpencodeFileReference,
  type QuestionAnswer,
  type UploadAttachment,
} from "@repo/api-client";
import { useSessionChatsStore } from "@repo/app-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";

export const useOpencodeSession = ({
  chatId,
  sessionId,
  serverUrl,
  accessToken,
  password,
  messageLimit,
}: {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
  messageLimit?: number;
}) => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["opencode", "session", chatId, sessionId, serverUrl],
    [chatId, serverUrl, sessionId],
  );
  const hasOptimisticSession =
    queryClient.getQueryData<OpencodeSessionData>(queryKey)?.optimistic ===
    true;
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const incoming = await getOpencodeSessionRaw(
        chatId,
        sessionId,
        serverUrl,
        accessToken,
        password,
        messageLimit,
      );
      return reconcileActiveOpencodeSession(
        queryClient.getQueryData<OpencodeSessionData>(queryKey),
        incoming,
      );
    },
    enabled: !!serverUrl && !!accessToken && !!password,
    staleTime: hasOptimisticSession ? Infinity : 0,
  });
  const resync = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey, exact: true });
  }, [queryClient, queryKey]);
  const loadingOlderRef = useRef(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const loadOlder = useCallback(async () => {
    const current = queryClient.getQueryData<OpencodeSessionData>(queryKey);
    const before = current?.messagePage?.oldestMessageId;
    if (
      !messageLimit ||
      !current?.messagePage?.hasOlder ||
      !before ||
      loadingOlderRef.current
    ) {
      return;
    }

    loadingOlderRef.current = true;
    setIsLoadingOlder(true);
    try {
      let older = await getOpencodeSessionMessages(
        chatId,
        current.session,
        serverUrl,
        accessToken,
        password,
        { before, limit: messageLimit },
      );
      let pageLimit = messageLimit;
      // Older servers may ignore `before`. Request a larger latest window
      // once, then fail visibly if the server still cannot advance history.
      const knownIds = new Set(
        current.messages.map((message) => message.info.id),
      );
      if (
        older.length > 0 &&
        older.every((message) => knownIds.has(message.info.id))
      ) {
        pageLimit = current.messages.length + messageLimit;
        older = await getOpencodeSessionMessages(
          chatId,
          current.session,
          serverUrl,
          accessToken,
          password,
          { limit: pageLimit },
        );
        if (
          older.length >= messageLimit &&
          older.every((message) => knownIds.has(message.info.id))
        ) {
          throw new Error(
            "The server returned the same history page. Update the project's OpenCode server and try again.",
          );
        }
      }
      queryClient.setQueryData<OpencodeSessionData>(queryKey, (latest) => {
        if (!latest) return latest;
        const existingIds = new Set(
          latest.messages.map((message) => message.info.id),
        );
        const uniqueOlder = older.filter(
          (message) => !existingIds.has(message.info.id),
        );
        const messages = [...uniqueOlder, ...latest.messages];
        return {
          ...latest,
          messages,
          messagePage: {
            hasOlder: older.length >= pageLimit && uniqueOlder.length > 0,
            oldestMessageId: messages[0]?.info.id,
          },
        };
      });
    } finally {
      loadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [
    accessToken,
    chatId,
    messageLimit,
    password,
    queryClient,
    queryKey,
    serverUrl,
  ]);

  return {
    ...query,
    isStreaming: query.data ? query.data.status.type !== "idle" : false,
    resync,
    loadOlder,
    isLoadingOlder,
    hasOlderMessages: query.data?.messagePage?.hasOlder === true,
  };
};

function reconcileActiveOpencodeSession(
  current: OpencodeSessionData | undefined,
  incoming: OpencodeSessionData,
): OpencodeSessionData {
  if (!current) {
    return incoming;
  }

  const incomingHasRealUserMessage = incoming.messages.some(
    (message) =>
      message.info.role === "user" &&
      !message.info.id.startsWith("optimistic:"),
  );
  const currentMessages = incomingHasRealUserMessage
    ? current.messages.filter(
        (message) => !message.info.id.startsWith("optimistic:"),
      )
    : current.messages;
  const incomingById = new Map(
    incoming.messages.map((message) => [message.info.id, message]),
  );
  const mergedMessages = currentMessages.map((message) => {
    const incomingMessage = incomingById.get(message.info.id);
    if (!incomingMessage) return message;

    incomingById.delete(message.info.id);
    const currentPartsById = new Map(
      message.parts.map((part) => [part.id, part]),
    );
    const parts = incomingMessage.parts.map((part) => {
      const currentPart = currentPartsById.get(part.id);
      currentPartsById.delete(part.id);
      return current.status.type === "idle" ? part : (currentPart ?? part);
    });

    return {
      info:
        current.status.type === "idle" ? incomingMessage.info : message.info,
      parts: [...parts, ...currentPartsById.values()],
    };
  });
  mergedMessages.push(...incomingById.values());

  return {
    ...incoming,
    messages: mergedMessages,
    messagePage: current.messagePage ?? incoming.messagePage,
    ...(!incomingHasRealUserMessage && current.optimistic
      ? { optimistic: true }
      : {}),
  };
}

export const useSendOpencodePrompt = ({
  chatId,
  sessionId,
  serverUrl,
  accessToken,
  password,
}: {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
}) => {
  return useMutation({
    onMutate: () => {
      const chatsStore = useSessionChatsStore.getState();
      chatsStore.setChatUnread(chatId, sessionId, false);
    },
    mutationFn: async ({
      text,
      files,
      attachments: directAttachments = [],
      fileReferences = [],
      selection,
    }: {
      text: string;
      files: File[];
      attachments?: UploadAttachment[];
      fileReferences?: OpencodeFileReference[];
      selection: OpencodePromptSelection;
    }) => {
      const fileAttachments: UploadAttachment[] = await Promise.all(
        files.map(async (file) => ({
          type: "image" as const,
          name: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          dataUrl: await fileToDataUrl(file),
        })),
      );

      return sendOpencodePrompt(
        chatId,
        sessionId,
        text,
        [...directAttachments, ...fileAttachments],
        fileReferences,
        selection,
        serverUrl,
        accessToken,
        password,
      );
    },
  });
};

export const useAbortOpencodeSession = ({
  chatId,
  sessionId,
  serverUrl,
  accessToken,
  password,
}: {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
}) => {
  const queryClient = useQueryClient();
  const queryKey = ["opencode", "session", chatId, sessionId, serverUrl];

  return useMutation({
    mutationFn: () =>
      abortOpencodeSession(chatId, sessionId, serverUrl, accessToken, password),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
};

export const useRevertOpencodeSession = ({
  chatId,
  sessionId,
  serverUrl,
  accessToken,
  password,
}: {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
}) => {
  const queryClient = useQueryClient();
  const queryKey = ["opencode", "session", chatId, sessionId, serverUrl];

  return useMutation({
    mutationFn: (messageId: string) =>
      revertOpencodeSession(
        chatId,
        sessionId,
        messageId,
        serverUrl,
        accessToken,
        password,
      ),
    onSuccess: (session) => {
      queryClient.setQueryData<OpencodeSessionData>(queryKey, (current) =>
        current ? { ...current, session } : current,
      );
      void queryClient.invalidateQueries({ queryKey, exact: true });
    },
  });
};

export const useRestoreRevertedOpencodeMessage = ({
  chatId,
  sessionId,
  serverUrl,
  accessToken,
  password,
}: {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
}) => {
  const queryClient = useQueryClient();
  const queryKey = ["opencode", "session", chatId, sessionId, serverUrl];

  return useMutation({
    mutationFn: ({
      nextMessageId,
    }: {
      messageId: string;
      nextMessageId?: string;
    }) =>
      nextMessageId
        ? revertOpencodeSession(
            chatId,
            sessionId,
            nextMessageId,
            serverUrl,
            accessToken,
            password,
          )
        : unrevertOpencodeSession(
            chatId,
            sessionId,
            serverUrl,
            accessToken,
            password,
          ),
    onSuccess: (session) => {
      queryClient.setQueryData<OpencodeSessionData>(queryKey, (current) =>
        current ? { ...current, session } : current,
      );
      void queryClient.invalidateQueries({ queryKey, exact: true });
    },
  });
};

export const useAnswerOpencodeQuestion = ({
  chatId,
  sessionId,
  serverUrl,
  accessToken,
  password,
}: {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
}) => {
  const queryClient = useQueryClient();
  const queryKey = ["opencode", "session", chatId, sessionId, serverUrl];

  return useMutation({
    mutationFn: ({
      requestId,
      answers,
    }: {
      requestId: string;
      answers: QuestionAnswer[];
    }) =>
      answerOpencodeQuestion(
        chatId,
        sessionId,
        requestId,
        answers,
        serverUrl,
        accessToken,
        password,
      ),
    onSuccess: (_, { requestId }) => {
      queryClient.setQueryData<OpencodeSessionData>(queryKey, (current) =>
        current
          ? {
              ...current,
              questions: current.questions.filter(
                (question) => question.id !== requestId,
              ),
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey });
    },
  });
};

export const useRejectOpencodeQuestion = ({
  chatId,
  sessionId,
  serverUrl,
  accessToken,
  password,
}: {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
}) => {
  const queryClient = useQueryClient();
  const queryKey = ["opencode", "session", chatId, sessionId, serverUrl];

  return useMutation({
    mutationFn: (requestId: string) =>
      rejectOpencodeQuestion(
        chatId,
        sessionId,
        requestId,
        serverUrl,
        accessToken,
        password,
      ),
    onSuccess: (_, requestId) => {
      queryClient.setQueryData<OpencodeSessionData>(queryKey, (current) =>
        current
          ? {
              ...current,
              questions: current.questions.filter(
                (question) => question.id !== requestId,
              ),
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey });
    },
  });
};

export const useOpencodeInventory = (
  chatId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
) =>
  useQuery({
    queryKey: ["opencode", "inventory", chatId, serverUrl],
    queryFn: () =>
      getOpencodeInventory(chatId, serverUrl, accessToken, password),
    enabled: !!serverUrl && !!accessToken,
    refetchInterval: (query) =>
      query.state.data?.models.length ? false : 2_000,
    refetchOnMount: "always",
    retry: 5,
    retryDelay: 1_000,
    staleTime: 60_000,
  });

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);

    reader.readAsDataURL(file);
  });
}
