"use client";

import { getOpencodeSessionRaw } from "@/services/opencode-services";
import { useQuery } from "@tanstack/react-query";

export const useOpencodeSession = ({
  chatId,
  serverUrl,
  sessionId,
}: {
  chatId: string;
  serverUrl?: string;
  sessionId: string;
}) =>
  useQuery({
    queryKey: ["opencode", "session", chatId, serverUrl, sessionId],
    queryFn: () => {
      if (!serverUrl) {
        throw new Error(`Chat ${chatId} has no OpenCode server`);
      }

      return getOpencodeSessionRaw(chatId, serverUrl, sessionId);
    },
    enabled: Boolean(serverUrl),
  });
