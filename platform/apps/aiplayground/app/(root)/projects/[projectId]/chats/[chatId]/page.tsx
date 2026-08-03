"use client";

import { NewOpencodeChat } from "@/components/chat/new-opencode-chat";
import { playgroundProjects } from "@/lib/playground-projects";
import { useParams, useSearchParams } from "next/navigation";

export default function NewOpencodeChatPage() {
  const { projectId, chatId } = useParams<{
    projectId: string;
    chatId: string;
  }>();
  const searchParams = useSearchParams();
  const project = playgroundProjects.find((item) => item.id === projectId);
  const chat = project?.chats.find((item) => item.id === chatId);

  if (!project || !chat) {
    return <div>Saved chat not found.</div>;
  }

  if (!chat.hasOpencodeServer) {
    return <div>Chat has no OpenCode server.</div>;
  }

  return (
    <NewOpencodeChat
      chatId={chatId}
      chatUrl={chat.url}
      directory={searchParams.get("directory") ?? undefined}
    />
  );
}
