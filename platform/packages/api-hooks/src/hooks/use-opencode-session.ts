"use client";

import {
  abortOpencodeSession,
  answerOpencodeQuestion,
  getOpencodeInventory,
  getOpencodeSessionRaw,
  rejectOpencodeQuestion,
  revertOpencodeSession,
  sendOpencodePrompt,
  unrevertOpencodeSession,
  type OpencodeSessionData,
  type OpencodePromptSelection,
  type QuestionAnswer,
  type UploadAttachment,
} from "@repo/api-client";
import { useSessionChatsStore } from "@repo/app-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

export const useOpencodeSession = ({
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

  return {
    ...query,
    isStreaming: query.data ? query.data.status.type !== "idle" : false,
    resync,
  };
};

function reconcileActiveOpencodeSession(
  current: OpencodeSessionData | undefined,
  incoming: OpencodeSessionData,
): OpencodeSessionData {
  if (!current || (!current.optimistic && current.status.type === "idle")) {
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
  const currentById = new Map(
    currentMessages.map((message) => [message.info.id, message]),
  );
  const mergedMessages = incoming.messages.map((message) => {
    const newerMessage = currentById.get(message.info.id);
    if (!newerMessage) return message;

    currentById.delete(message.info.id);
    const newerPartsById = new Map(
      newerMessage.parts.map((part) => [part.id, part]),
    );
    const parts = message.parts.map((part) => {
      const newerPart = newerPartsById.get(part.id);
      newerPartsById.delete(part.id);
      return newerPart ?? part;
    });

    return {
      info: newerMessage.info,
      parts: [...parts, ...newerPartsById.values()],
    };
  });
  mergedMessages.push(...currentById.values());

  return {
    ...incoming,
    messages: mergedMessages,
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
      selection,
    }: {
      text: string;
      files: File[];
      attachments?: UploadAttachment[];
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
