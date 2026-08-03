"use client";

import { OpencodeSessionChat } from "@/components/chat/opencode-session-chat";
import { useOpencodeSession } from "@/hooks/use-opencode-session";
import { playgroundProjects } from "@/lib/playground-projects";
import { useParams } from "next/navigation";

export default function OpencodeSessionPage() {
  const { projectId, chatId, sessionId } = useParams<{
    projectId: string;
    chatId: string;
    sessionId: string;
  }>();
  const project = playgroundProjects.find((item) => item.id === projectId);
  const chat = project?.chats.find((item) => item.id === chatId);
  const { data, error, isPending, isStreaming } = useOpencodeSession({
    chatId,
    sessionId,
  });

  if (!project || !chat) {
    return <div>Saved chat not found.</div>;
  }

  if (!chat.hasOpencodeServer) {
    return <div>Chat has no OpenCode server.</div>;
  }

  if (isPending) {
    return null;
  }

  if (error) {
    return <div>{error.message}</div>;
  }

  return (
    <OpencodeSessionChat
      chatId={chatId}
      sessionId={sessionId}
      messages={data.messages}
      rawResponse={data}
      isStreaming={isStreaming}
    />
  );
}
