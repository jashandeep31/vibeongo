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
} from "@/services/opencode-services";
import { useSessionChatsStore } from "@/store/playground-store";
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
    queryFn: () =>
      getOpencodeSessionRaw(
        chatId,
        sessionId,
        serverUrl,
        accessToken,
        password,
      ),
    enabled: !!serverUrl && !!accessToken,
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
  const queryClient = useQueryClient();
  const queryKey = ["opencode", "session", chatId, sessionId, serverUrl];

  return useMutation({
    onMutate: () => {
      const chatsStore = useSessionChatsStore.getState();
      chatsStore.setChatStatus(chatId, sessionId, { type: "busy" });
      chatsStore.setChatUnread(chatId, sessionId, false);
    },
    mutationFn: async ({
      text,
      files,
      selection,
    }: {
      text: string;
      files: File[];
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

      return sendOpencodePrompt(
        chatId,
        sessionId,
        text,
        attachments,
        selection,
        serverUrl,
        accessToken,
        password,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      useSessionChatsStore
        .getState()
        .setChatStatus(chatId, sessionId, { type: "idle" });
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
