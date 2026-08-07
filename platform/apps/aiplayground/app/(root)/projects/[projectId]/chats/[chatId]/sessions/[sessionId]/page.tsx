"use client";

import { OpencodeSessionChat } from "@/components/chat/opencode-session-chat";
import { useOpencodeSession } from "@/hooks/use-opencode-session";
import { useParams, useSearchParams } from "next/navigation";
import { useSessionsStore } from "@/store/playground-store";

export default function OpencodeSessionPage() {
  const { projectId, chatId, sessionId } = useParams<{
    projectId: string;
    chatId: string;
    sessionId: string;
  }>();
  const searchParams = useSearchParams();
  const serverUrl = searchParams.get("serverUrl") ?? "";
  const accessToken = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === chatId)?.instance
        ?.access_token ?? "",
  );
  const { data, error, isPending, isStreaming } = useOpencodeSession({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
  });

  if (!serverUrl || !accessToken) {
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
      projectId={projectId}
      chatId={chatId}
      sessionId={sessionId}
      serverUrl={serverUrl}
      accessToken={accessToken}
      messages={data.messages}
      rawResponse={data}
      isStreaming={isStreaming}
    />
  );
}
