"use client";

import { NewOpencodeChat } from "@/components/chat/new-opencode-chat";
import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import { RuntimePulseMenu } from "@/components/runtime-pulse-menu";
import { Button } from "@repo/ui/components/button";
import { ArrowLeft, FolderOpen, Settings2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useProjectsStore, useSessionsStore } from "@repo/app-store";
import { getOpencodePassword } from "@repo/api-client";

export default function NewOpencodeChatPage() {
  const { projectId, chatId } = useParams<{
    projectId: string;
    chatId: string;
  }>();
  const searchParams = useSearchParams();
  const serverUrl = searchParams.get("serverUrl");
  const projectName = useProjectsStore(
    (store) =>
      store.projects.find((project) => project.id === projectId)?.name ??
      "Project",
  );
  const sessionEntry = useSessionsStore((store) =>
    store.sessions.find((entry) => entry.session.id === chatId),
  );
  const accessToken = sessionEntry?.instance?.access_token ?? "";
  const opencodePassword = getOpencodePassword(sessionEntry?.instance?.config);
  const sessionName = sessionEntry?.session.name ?? "Session";

  if (!serverUrl || !accessToken || !opencodePassword) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="bg-destructive/10 text-destructive flex size-11 items-center justify-center rounded-full">
            <TriangleAlert className="size-5" />
          </div>
          <div className="space-y-1">
            <h1 className="font-medium">OpenCode server unavailable</h1>
            <p className="text-muted-foreground text-sm">
              This session is no longer running or its connection has expired.
              Return home to start or resume a session.
            </p>
          </div>
          <Button asChild>
            <Link href="/">
              <ArrowLeft />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const chatUrl = `/projects/${projectId}/chats/${chatId}`;

  return (
    <div className="relative flex min-h-0 w-full min-w-0 flex-1 overflow-x-hidden">
      <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
        <Button
          asChild
          type="button"
          variant="outline"
          size="icon-sm"
          className="bg-background/90 shadow-sm backdrop-blur"
        >
          <Link
            href={`${chatUrl}/files`}
            aria-label="Open files"
            title="Open files"
          >
            <FolderOpen />
          </Link>
        </Button>
        <Button
          asChild
          type="button"
          variant="outline"
          size="icon-sm"
          className="bg-background/90 shadow-sm backdrop-blur"
        >
          <Link
            href={`${chatUrl}/settings`}
            aria-label="Runtime settings"
            title="Runtime settings"
          >
            <Settings2 />
          </Link>
        </Button>
        <RuntimePulseMenu projectSessionId={chatId} />
        <ProjectDomainsDialog projectId={projectId} projectSessionId={chatId} />
      </div>
      <NewOpencodeChat
        chatId={chatId}
        chatUrl={chatUrl}
        serverUrl={serverUrl}
        accessToken={accessToken}
        password={opencodePassword}
        directory={searchParams.get("directory") ?? undefined}
        projectName={projectName}
        sessionName={sessionName}
      />
    </div>
  );
}
