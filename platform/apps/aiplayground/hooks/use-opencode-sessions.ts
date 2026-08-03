"use client";

import {
  createOpencodeSession,
  getOpencodeProjectDirectories,
  getOpencodeSessions,
  sendOpencodePrompt,
  type OpencodePromptSelection,
  type UploadAttachment,
} from "@/services/opencode-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useOpencodeSessions = (
  chatId: string,
  serverUrl: string,
  enabled = true,
) =>
  useQuery({
    queryKey: ["opencode", "chat-sessions", chatId, serverUrl],
    queryFn: () => getOpencodeSessions(chatId, serverUrl),
    enabled: enabled && !!chatId && !!serverUrl,
  });

export const useOpencodeProjectDirectories = (
  chatId: string,
  serverUrl: string,
  enabled = true,
) =>
  useQuery({
    queryKey: ["opencode", "project-directories", chatId, serverUrl],
    queryFn: () => getOpencodeProjectDirectories(chatId, serverUrl),
    enabled: enabled && !!chatId && !!serverUrl,
  });

export const useStartOpencodeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chatId,
      serverUrl,
      directory,
      text,
      files,
      selection,
    }: {
      chatId: string;
      serverUrl: string;
      directory?: string;
      text: string;
      files: File[];
      selection: OpencodePromptSelection;
    }) => {
      const session = await createOpencodeSession(chatId, serverUrl, directory);
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
      );
      return session;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["opencode", "chat-sessions"],
      }),
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
