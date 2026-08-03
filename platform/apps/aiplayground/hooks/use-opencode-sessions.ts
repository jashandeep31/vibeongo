"use client";

import { playgroundProjects } from "@/lib/playground-projects";
import {
  getOpencodeSessionsByChat,
  type OpencodeChatConnection,
} from "@/services/opencode-services";
import { useQuery } from "@tanstack/react-query";

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
