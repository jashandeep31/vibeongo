"use client";

import {
  createOpencodeSession,
  getOpencodeProjectDirectories,
  getOpencodeSessions,
  sendOpencodePrompt,
  type OpencodeSessionData,
  type OpencodePromptSelection,
  type UploadAttachment,
} from "@/services/opencode-services";
import { useSessionChatsStore } from "@/store/playground-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const useOpencodeSessions = (
  chatId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
  enabled = true,
) => {
  const setSessionChats = useSessionChatsStore(
    (store) => store.setSessionChats,
  );
  const query = useQuery({
    queryKey: ["opencode", "chat-sessions", chatId, serverUrl],
    queryFn: () =>
      getOpencodeSessions(chatId, serverUrl, accessToken, password),
    enabled: enabled && !!chatId && !!serverUrl && !!accessToken,
  });

  useEffect(() => {
    if (!query.data) return;
    setSessionChats(chatId, query.data);
  }, [chatId, query.data, setSessionChats]);

  return query;
};

export const useOpencodeProjectDirectories = (
  chatId: string,
  serverUrl: string,
  accessToken: string,
  password?: string,
  enabled = true,
) =>
  useQuery({
    queryKey: ["opencode", "project-directories", chatId, serverUrl],
    queryFn: () =>
      getOpencodeProjectDirectories(chatId, serverUrl, accessToken, password),
    enabled: enabled && !!chatId && !!serverUrl && !!accessToken,
  });

export const useStartOpencodeSession = () => {
  const queryClient = useQueryClient();
  const upsertSessionChat = useSessionChatsStore(
    (store) => store.upsertSessionChat,
  );

  return useMutation({
    mutationFn: async ({
      chatId,
      serverUrl,
      accessToken,
      password,
      directory,
      text,
      files,
      selection,
      onSessionCreated,
    }: {
      chatId: string;
      serverUrl: string;
      accessToken: string;
      password?: string;
      directory?: string;
      text: string;
      files: File[];
      selection: OpencodePromptSelection;
      onSessionCreated?: (sessionId: string) => void;
    }) => {
      const session = await createOpencodeSession(
        chatId,
        serverUrl,
        accessToken,
        directory,
        password,
      );
      upsertSessionChat(chatId, session);

      const [providerID = session.model?.providerID ?? "", ...modelParts] =
        selection.model?.split("/") ?? [];
      const modelID = modelParts.join("/") || session.model?.id || "";
      const optimisticMessageId = `optimistic:${session.id}`;
      const now = Date.now();
      const optimisticSession: OpencodeSessionData = {
        session,
        status: { type: "busy" },
        changes: [],
        questions: [],
        optimistic: true,
        messages: [
          {
            info: {
              id: optimisticMessageId,
              sessionID: session.id,
              role: "user",
              time: { created: now },
              agent: selection.agent ?? session.agent ?? "",
              model: {
                providerID,
                modelID,
                ...(selection.variant
                  ? { variant: selection.variant }
                  : session.model?.variant
                    ? { variant: session.model.variant }
                    : {}),
              },
            },
            parts: text
              ? [
                  {
                    id: `${optimisticMessageId}:text`,
                    sessionID: session.id,
                    messageID: optimisticMessageId,
                    type: "text",
                    text,
                  },
                ]
              : [],
          },
        ],
      };

      queryClient.setQueryData(
        ["opencode", "session", chatId, session.id, serverUrl],
        optimisticSession,
      );
      onSessionCreated?.(session.id);

      const attachments: UploadAttachment[] = await Promise.all(
        files.map(async (file) => ({
          type: "image" as const,
          name: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          dataUrl: await fileToDataUrl(file),
        })),
      );

      await sendOpencodePrompt(
        chatId,
        session.id,
        text,
        attachments,
        selection,
        serverUrl,
        accessToken,
        password,
      );
      return session;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["opencode", "chat-sessions"],
      });
    },
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
