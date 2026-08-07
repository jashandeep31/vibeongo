"use client";

import {
  createOpencodeSession,
  getOpencodeProjectDirectories,
  getOpencodeSessions,
  sendOpencodePrompt,
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
  enabled = true,
) => {
  const setSessionChats = useSessionChatsStore(
    (store) => store.setSessionChats,
  );
  const query = useQuery({
    queryKey: ["opencode", "chat-sessions", chatId, serverUrl],
    queryFn: () => getOpencodeSessions(chatId, serverUrl, accessToken),
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
  enabled = true,
) =>
  useQuery({
    queryKey: ["opencode", "project-directories", chatId, serverUrl],
    queryFn: () =>
      getOpencodeProjectDirectories(chatId, serverUrl, accessToken),
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
      directory,
      text,
      files,
      selection,
    }: {
      chatId: string;
      serverUrl: string;
      accessToken: string;
      directory?: string;
      text: string;
      files: File[];
      selection: OpencodePromptSelection;
    }) => {
      const session = await createOpencodeSession(
        chatId,
        serverUrl,
        accessToken,
        directory,
      );
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
      );
      return session;
    },
    onSuccess: (session, variables) => {
      upsertSessionChat(variables.chatId, session);
      return queryClient.invalidateQueries({
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
