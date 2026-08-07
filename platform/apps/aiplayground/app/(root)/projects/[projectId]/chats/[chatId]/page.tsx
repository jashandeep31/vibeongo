"use client";

import { NewOpencodeChat } from "@/components/chat/new-opencode-chat";
import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
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
    <div className="relative flex min-h-0 flex-1">
      <div className="absolute top-3 right-3 z-50">
        <ProjectDomainsDialog projectId={projectId} projectSessionId={chatId} />
      </div>
      <NewOpencodeChat
        chatId={chatId}
        chatUrl={chatUrl}
        serverUrl={serverUrl}
        directory={searchParams.get("directory") ?? undefined}
      />
    </div>
  );
}
