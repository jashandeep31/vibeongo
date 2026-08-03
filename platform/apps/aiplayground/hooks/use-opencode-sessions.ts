"use client";

import { playgroundProjects } from "@/lib/playground-projects";
import {
  createOpencodeSession,
  getOpencodeSessionsByChat,
  sendOpencodePrompt,
  type OpencodeChatConnection,
  type OpencodePromptSelection,
  type UploadAttachment,
} from "@/services/opencode-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const connections: OpencodeChatConnection[] = playgroundProjects.flatMap(
  (project) =>
    project.chats.flatMap((chat) =>
      chat.hasOpencodeServer
        ? [
            {
              projectId: project.id,
              chatId: chat.id,
            },
          ]
        : [],
    ),
);

export const useOpencodeSessions = () =>
  useQuery({
    queryKey: ["opencode", "chat-sessions", connections],
    queryFn: () => {
      console.log("[Playground] saved projects", playgroundProjects);
      return getOpencodeSessionsByChat(connections);
    },
    enabled: connections.length > 0,
  });

export const useStartOpencodeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chatId,
      directory,
      text,
      files,
      selection,
    }: {
      chatId: string;
      directory?: string;
      text: string;
      files: File[];
      selection: OpencodePromptSelection;
    }) => {
      const session = await createOpencodeSession(chatId, directory);
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
