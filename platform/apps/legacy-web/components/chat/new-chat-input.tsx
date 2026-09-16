"use client";

import { PromptInput } from "@/components/chat/prompt-input";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVibeSocket } from "@/hooks/use-vibe-socket";

export function NewChatInput() {
  const { websocket, sendJsonMessage } = useVibeSocket();
  const router = useRouter();

  useEffect(() => {
    if (!websocket) return;

    const handleNewChatResponse = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;

      let message: unknown;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "new-chat" &&
        "data" in message &&
        typeof message.data === "object" &&
        message.data !== null &&
        "chatId" in message.data &&
        typeof message.data.chatId === "string"
      ) {
        router.push(`/chats/${message.data.chatId}`);
      }
    };

    websocket.addEventListener("message", handleNewChatResponse);
    return () => {
      websocket.removeEventListener("message", handleNewChatResponse);
    };
  }, [router, websocket]);

  const handleSubmit = (question: string) => {
    sendJsonMessage({
      type: "new-chat",
      data: {
        question,
      },
    });
  };

  return (
    <PromptInput
      onSubmit={handleSubmit}
      disabled={websocket?.readyState !== WebSocket.OPEN}
    />
  );
}
