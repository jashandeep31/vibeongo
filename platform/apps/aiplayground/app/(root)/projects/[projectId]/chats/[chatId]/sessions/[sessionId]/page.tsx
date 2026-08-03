"use client";

import { OpencodeSessionChat } from "@/components/chat/opencode-session-chat";
import { useOpencodeSession } from "@/hooks/use-opencode-session";
import { useParams, useSearchParams } from "next/navigation";

export default function OpencodeSessionPage() {
  const { chatId, sessionId } = useParams<{
    chatId: string;
    sessionId: string;
  }>();
  const searchParams = useSearchParams();
  const serverUrl = searchParams.get("serverUrl") ?? "";
  const { data, error, isPending, isStreaming } = useOpencodeSession({
    chatId,
    sessionId,
    serverUrl,
  });

  if (!serverUrl) {
    return <div>OpenCode server is not available for this session.</div>;
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
      serverUrl={serverUrl}
      messages={data.messages}
      rawResponse={data}
      isStreaming={isStreaming}
    />
  );
}
