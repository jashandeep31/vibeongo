"use client";

import {
  abortOpencodeSession,
  answerOpencodeQuestion,
  cancelOpencodeQueuedPrompt,
  getOpencodeInventory,
  getOpencodeQueuedPrompts,
  getOpencodeSessionMessagePage,
  getOpencodeSessionRaw,
  rejectOpencodeQuestion,
  revertOpencodeSession,
  sendOpencodePrompt,
  steerOpencodeQueuedPrompt,
  queueOpencodePrompt,
  reorderOpencodeQueuedPrompts,
  unrevertOpencodeSession,
  type OpencodeSessionData,
  type OpencodeQueuedPrompt,
  type OpencodePromptSelection,
  type OpencodeFileReference,
  type QuestionAnswer,
  type UploadAttachment,
} from "@repo/api-client";
import { useSessionChatsStore } from "@repo/app-store";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";

export const useOpencodeSession = ({
  chatId,
  sessionId,
  serverUrl,
  accessToken,
  password,
  messageLimit,
  select,
  refetchOnMount,
  notifyOnChangeProps,
  gcTime,
}: {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
  messageLimit?: number;
  select?: (data: OpencodeSessionData) => OpencodeSessionData;
  refetchOnMount?: boolean;
  notifyOnChangeProps?: UseQueryOptions<OpencodeSessionData>["notifyOnChangeProps"];
  gcTime?: number;
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
    ...(gcTime === undefined ? {} : { gcTime }),
    ...(select ? { select } : {}),
    ...(refetchOnMount === undefined ? {} : { refetchOnMount }),
    ...(notifyOnChangeProps === undefined ? {} : { notifyOnChangeProps }),
  });
  const resync = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey, exact: true });
  }, [queryClient, queryKey]);
  const loadingOlderRef = useRef(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const loadOlder = useCallback(async () => {
    const current = queryClient.getQueryData<OpencodeSessionData>(queryKey);
    const cursor = current?.messagePage?.cursor;
    if (
      !messageLimit ||
      !current?.messagePage?.hasOlder ||
      !cursor ||
      loadingOlderRef.current
    ) {
      return;
    }

    loadingOlderRef.current = true;
    setIsLoadingOlder(true);
    try {
      const olderPage = await getOpencodeSessionMessagePage(
        chatId,
        current.session,
        serverUrl,
        accessToken,
        password,
        { cursor, limit: messageLimit },
      );
      queryClient.setQueryData<OpencodeSessionData>(queryKey, (latest) => {
        if (!latest) return latest;
        const existingIds = new Set(
          latest.messages.map((message) => message.info.id),
        );
        const uniqueOlder = olderPage.messages.filter(
          (message) => !existingIds.has(message.info.id),
        );
        const messages = [...uniqueOlder, ...latest.messages];
        return {
          ...latest,
          messages,
          messagePage: {
            hasOlder: Boolean(olderPage.cursor),
            ...(olderPage.cursor ? { cursor: olderPage.cursor } : {}),
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
  const retainedMessages = incomingHasRealUserMessage
    ? current.messages.filter(
        (message) => !message.info.id.startsWith("optimistic:"),
      )
    : current.messages;
  const currentMessages = dedupeOpencodeMessages(retainedMessages);
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
      parts:
        current.status.type === "idle"
          ? parts
          : dedupeOpencodeParts([...parts, ...currentPartsById.values()]),
    };
  });
  mergedMessages.push(...incomingById.values());

  return {
    ...incoming,
    messages: dedupeOpencodeMessages(mergedMessages),
    messagePage: current.messagePage ?? incoming.messagePage,
    ...(!incomingHasRealUserMessage && current.optimistic
      ? { optimistic: true }
      : {}),
  };
}

function dedupeOpencodeMessages(messages: OpencodeSessionData["messages"]) {
  const byId = new Map<string, OpencodeSessionData["messages"][number]>();
  for (const message of messages) {
    const existing = byId.get(message.info.id);
    byId.set(
      message.info.id,
      existing
        ? {
            info: message.info,
            parts: dedupeOpencodeParts([...existing.parts, ...message.parts]),
          }
        : message,
    );
  }
  return [...byId.values()];
}

function dedupeOpencodeParts(
  parts: OpencodeSessionData["messages"][number]["parts"],
) {
  return [...new Map(parts.map((part) => [part.id, part])).values()];
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

export const useOpencodeQueuedPrompts = ({
  sessionId,
  serverUrl,
  accessToken,
  password,
}: {
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
}) =>
  useQuery({
    queryKey: ["opencode", "queue", sessionId, serverUrl],
    queryFn: () =>
      getOpencodeQueuedPrompts(sessionId, serverUrl, accessToken, password),
    enabled: !!sessionId && !!serverUrl && !!accessToken && !!password,
    refetchInterval: 1_000,
  });

export const useQueueOpencodePrompt = ({
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
  const queryKey = ["opencode", "queue", sessionId, serverUrl];
  return useMutation({
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
      const attachments: UploadAttachment[] = await Promise.all(
        files.map(async (file) => ({
          type: "image" as const,
          name: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          dataUrl: await fileToDataUrl(file),
        })),
      );
      return queueOpencodePrompt(
        chatId,
        sessionId,
        text,
        [...directAttachments, ...attachments],
        fileReferences,
        selection,
        serverUrl,
        accessToken,
        password,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useCancelOpencodeQueuedPrompt = ({
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
  const queueQueryKey = ["opencode", "queue", sessionId, serverUrl];
  const sessionQueryKey = ["opencode", "session", chatId, sessionId, serverUrl];
  return useMutation({
    mutationFn: (inboxId: string) =>
      cancelOpencodeQueuedPrompt(
        sessionId,
        inboxId,
        serverUrl,
        accessToken,
        password,
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queueQueryKey }),
        queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
      ]),
  });
};

export const useSteerOpencodeQueuedPrompt = ({
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
  const queueQueryKey = ["opencode", "queue", sessionId, serverUrl];
  const sessionQueryKey = ["opencode", "session", chatId, sessionId, serverUrl];
  return useMutation({
    mutationFn: (inboxId: string) =>
      steerOpencodeQueuedPrompt(
        sessionId,
        inboxId,
        serverUrl,
        accessToken,
        password,
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queueQueryKey }),
        queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
      ]),
  });
};

export const useReorderOpencodeQueuedPrompts = ({
  sessionId,
  serverUrl,
  accessToken,
  password,
}: {
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
}) => {
  const queryClient = useQueryClient();
  const queryKey = ["opencode", "queue", sessionId, serverUrl];
  return useMutation({
    mutationFn: ({
      queuedPrompts,
      inboxIds,
    }: {
      queuedPrompts: OpencodeQueuedPrompt[];
      inboxIds: string[];
    }) =>
      reorderOpencodeQueuedPrompts(
        queuedPrompts,
        inboxIds,
        sessionId,
        serverUrl,
        accessToken,
        password,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
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
