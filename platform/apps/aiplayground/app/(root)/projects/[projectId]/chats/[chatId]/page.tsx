"use client";

import { NewOpencodeChat } from "@/components/chat/new-opencode-chat";
import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import { useParams, useSearchParams } from "next/navigation";
import { useSessionsStore } from "@/store/playground-store";

export default function NewOpencodeChatPage() {
  const { projectId, chatId } = useParams<{
    projectId: string;
    chatId: string;
  }>();
  const searchParams = useSearchParams();
  const serverUrl = searchParams.get("serverUrl");
  const accessToken = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === chatId)?.instance
        ?.access_token ?? "",
  );

  if (!serverUrl || !accessToken) {
    return <div>OpenCode server is not available for this session.</div>;
  }

  const chatUrl = `/projects/${projectId}/chats/${chatId}`;

  return (
    <div className="relative flex min-h-0 flex-1">
      <div className="absolute top-3 right-3 z-50">
        <ProjectDomainsDialog projectId={projectId} projectSessionId={chatId} />
      </div>
      <NewOpencodeChat
        chatId={chatId}
        chatUrl={chatUrl}
        serverUrl={serverUrl}
        accessToken={accessToken}
        directory={searchParams.get("directory") ?? undefined}
      />
    </div>
  );
}
