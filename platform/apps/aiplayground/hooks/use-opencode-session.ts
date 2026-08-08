"use client";

import {
  abortOpencodeSession,
  answerOpencodeQuestion,
  getOpencodeInventory,
  getOpencodeSessionRaw,
  rejectOpencodeQuestion,
  sendOpencodePrompt,
  streamOpencodeEvents,
  type Event,
  type OpencodeSessionData,
  type OpencodePromptSelection,
  type QuestionAnswer,
  type UploadAttachment,
} from "@/services/opencode-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export const useOpencodeSession = ({
  chatId,
  sessionId,
  serverUrl,
  accessToken,
}: {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
}) => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["opencode", "session", chatId, sessionId, serverUrl],
    [chatId, serverUrl, sessionId],
  );
  const hasOptimisticSession =
    queryClient.getQueryData<OpencodeSessionData>(queryKey)?.optimistic ===
    true;
  const [isStreaming, setIsStreaming] = useState(hasOptimisticSession);
  const query = useQuery({
    queryKey,
    queryFn: () =>
      getOpencodeSessionRaw(chatId, sessionId, serverUrl, accessToken),
    enabled: !!serverUrl && !!accessToken,
    staleTime: hasOptimisticSession ? Infinity : 0,
  });

  useEffect(() => {
    if (!serverUrl || !accessToken) return;

    const controller = new AbortController();

    const updateCachedSession = (event: Event) => {
      queryClient.setQueryData<OpencodeSessionData>(queryKey, (current) => {
        if (!current) return current;

        if (
          event.type === "question.asked" &&
          event.properties.sessionID === sessionId
        ) {
          const question = event.properties;
          return {
            ...current,
            questions: [
              ...current.questions.filter((item) => item.id !== question.id),
              question,
            ],
          };
        }

        if (
          (event.type === "question.replied" ||
            event.type === "question.rejected") &&
          event.properties.sessionID === sessionId
        ) {
          return {
            ...current,
            questions: current.questions.filter(
              (question) => question.id !== event.properties.requestID,
            ),
          };
        }

        if (
          event.type === "message.updated" &&
          event.properties.sessionID === sessionId
        ) {
          const currentMessages =
            event.properties.info.role === "user"
              ? current.messages.filter(
                  (message) => !message.info.id.startsWith("optimistic:"),
                )
              : current.messages;
          const messageIndex = currentMessages.findIndex(
            (message) => message.info.id === event.properties.info.id,
          );
          const messages = [...currentMessages];

          if (messageIndex === -1) {
            messages.push({ info: event.properties.info, parts: [] });
          } else {
            messages[messageIndex] = {
              info: event.properties.info,
              parts: messages[messageIndex]?.parts ?? [],
            };
          }

          return {
            ...current,
            messages,
            optimistic:
              event.properties.info.role === "user"
                ? false
                : current.optimistic,
          };
        }

        if (
          event.type === "message.part.updated" &&
          event.properties.sessionID === sessionId
        ) {
          const updatedPart = event.properties.part;
          return {
            ...current,
            messages: current.messages.map((message) => {
              if (message.info.id !== updatedPart.messageID) return message;

              const partIndex = message.parts.findIndex(
                (part) => part.id === updatedPart.id,
              );
              const parts = [...message.parts];

              if (partIndex === -1) {
                parts.push(updatedPart);
              } else {
                parts[partIndex] = updatedPart;
              }

              return { ...message, parts };
            }),
          };
        }

        if (
          event.type === "message.part.delta" &&
          event.properties.sessionID === sessionId
        ) {
          const { messageID, partID, field, delta } = event.properties;
          return {
            ...current,
            messages: current.messages.map((message) => {
              if (message.info.id !== messageID) return message;

              return {
                ...message,
                parts: message.parts.map((part) => {
                  if (part.id !== partID) return part;

                  const partRecord = part as unknown as Record<string, unknown>;
                  const existingValue = partRecord[field];
                  return {
                    ...part,
                    [field]: `${typeof existingValue === "string" ? existingValue : ""}${delta}`,
                  };
                }),
              };
            }),
          };
        }

        if (
          event.type === "message.removed" &&
          event.properties.sessionID === sessionId
        ) {
          return {
            ...current,
            messages: current.messages.filter(
              (message) => message.info.id !== event.properties.messageID,
            ),
          };
        }

        if (
          event.type === "message.part.removed" &&
          event.properties.sessionID === sessionId
        ) {
          return {
            ...current,
            messages: current.messages.map((message) =>
              message.info.id === event.properties.messageID
                ? {
                    ...message,
                    parts: message.parts.filter(
                      (part) => part.id !== event.properties.partID,
                    ),
                  }
                : message,
            ),
          };
        }

        if (
          event.type === "session.updated" &&
          event.properties.sessionID === sessionId
        ) {
          return { ...current, session: event.properties.info };
        }

        if (
          event.type === "session.diff" &&
          event.properties.sessionID === sessionId
        ) {
          return { ...current, changes: event.properties.diff };
        }

        return current;
      });
    };

    const handleEvent = (event: Event) => {
      if (
        event.type === "session.status" &&
        event.properties.sessionID === sessionId
      ) {
        setIsStreaming(event.properties.status.type !== "idle");
      }

      if (
        event.type === "session.idle" &&
        event.properties.sessionID === sessionId
      ) {
        setIsStreaming(false);
        void queryClient.invalidateQueries({ queryKey });
      }

      if (
        event.type === "session.error" &&
        event.properties.sessionID === sessionId
      ) {
        setIsStreaming(false);
      }

      if (
        event.type === "session.updated" &&
        event.properties.sessionID === sessionId
      ) {
        void queryClient.invalidateQueries({
          queryKey: ["opencode", "chat-sessions", chatId, serverUrl],
        });
      }

      updateCachedSession(event);
    };

    const connect = async () => {
      while (!controller.signal.aborted) {
        try {
          await streamOpencodeEvents(
            chatId,
            serverUrl,
            accessToken,
            controller.signal,
            handleEvent,
          );
        } catch (error) {
          if (!controller.signal.aborted) {
            console.error("OpenCode event stream failed", error);
          }
        }

        if (!controller.signal.aborted) {
          await new Promise((resolve) => window.setTimeout(resolve, 1_000));
        }
      }
    };

    void connect();

    return () => controller.abort();
  }, [accessToken, chatId, queryClient, queryKey, serverUrl, sessionId]);

  return { ...query, isStreaming };
};

export const useSendOpencodePrompt = ({
  chatId,
  sessionId,
  serverUrl,
  accessToken,
}: {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
}) => {
  const queryClient = useQueryClient();
  const queryKey = ["opencode", "session", chatId, sessionId, serverUrl];

  return useMutation({
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
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
};

export const useAbortOpencodeSession = ({
  chatId,
  sessionId,
  serverUrl,
  accessToken,
}: {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
}) => {
  const queryClient = useQueryClient();
  const queryKey = ["opencode", "session", chatId, sessionId, serverUrl];

  return useMutation({
    mutationFn: () =>
      abortOpencodeSession(chatId, sessionId, serverUrl, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
};

export const useAnswerOpencodeQuestion = ({
  chatId,
  sessionId,
  serverUrl,
  accessToken,
}: {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
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
}: {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
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
) =>
  useQuery({
    queryKey: ["opencode", "inventory", chatId, serverUrl],
    queryFn: () => getOpencodeInventory(chatId, serverUrl, accessToken),
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
