"use client";

import { NewOpencodeChat } from "@/components/chat/new-opencode-chat";
import { useParams, useSearchParams } from "next/navigation";

export default function NewOpencodeChatPage() {
  const { projectId, chatId } = useParams<{
    projectId: string;
    chatId: string;
  }>();
  const searchParams = useSearchParams();
  const serverUrl = searchParams.get("serverUrl");

  if (!serverUrl) {
    return <div>OpenCode server is not available for this session.</div>;
  }

  const chatUrl = `/projects/${projectId}/chats/${chatId}`;

  return (
    <NewOpencodeChat
      chatId={chatId}
      chatUrl={chatUrl}
      serverUrl={serverUrl}
      directory={searchParams.get("directory") ?? undefined}
    />
  );
}
