"use client";

import {
  getOpencodeEventUrl,
  getOpencodeSessionRaw,
  sendOpencodePrompt,
  type Event,
  type OpencodeSessionData,
  type UploadAttachment,
} from "@/services/opencode-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export const useOpencodeSession = ({
  chatId,
  sessionId,
}: {
  chatId: string;
  sessionId: string;
}) => {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const queryKey = useMemo(
    () => ["opencode", "session", chatId, sessionId],
    [chatId, sessionId],
  );
  const query = useQuery({
    queryKey,
    queryFn: () => getOpencodeSessionRaw(chatId, sessionId),
  });

  useEffect(() => {
    const source = new EventSource(getOpencodeEventUrl(chatId));

    const updateCachedSession = (event: Event) => {
      queryClient.setQueryData<OpencodeSessionData>(queryKey, (current) => {
        if (!current) return current;

        if (
          event.type === "message.updated" &&
          event.properties.sessionID === sessionId
        ) {
          const messageIndex = current.messages.findIndex(
            (message) => message.info.id === event.properties.info.id,
          );
          const messages = [...current.messages];

          if (messageIndex === -1) {
            messages.push({ info: event.properties.info, parts: [] });
          } else {
            messages[messageIndex] = {
              info: event.properties.info,
              parts: messages[messageIndex]?.parts ?? [],
            };
          }

          return { ...current, messages };
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

    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as Event;

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

      updateCachedSession(event);
    };

    return () => source.close();
  }, [chatId, queryClient, queryKey, sessionId]);

  return { ...query, isStreaming };
};

export const useSendOpencodePrompt = ({
  chatId,
  sessionId,
}: {
  chatId: string;
  sessionId: string;
}) => {
  const queryClient = useQueryClient();
  const queryKey = ["opencode", "session", chatId, sessionId];

  return useMutation({
    mutationFn: async ({ text, files }: { text: string; files: File[] }) => {
      const attachments: UploadAttachment[] = await Promise.all(
        files.map(async (file) => ({
          type: "image" as const,
          name: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          dataUrl: await fileToDataUrl(file),
        })),
      );

      return sendOpencodePrompt(chatId, sessionId, text, attachments);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);

    reader.readAsDataURL(file);
  });
}
