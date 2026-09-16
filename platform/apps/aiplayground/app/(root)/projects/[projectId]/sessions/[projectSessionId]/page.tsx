"use client";

import { NewOpencodeChat } from "@/components/chat/new-opencode-chat";
import { OpencodeChatTopBar } from "@/components/chat/opencode-chat-top-bar";
import { useOpencodeProjectDirectories } from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useProjectsStore, useSessionsStore } from "@repo/app-store";
import { getOpencodePassword } from "@repo/api-client";

export default function NewOpencodeChatPage() {
  const { projectId, projectSessionId } = useParams<{
    projectId: string;
    projectSessionId: string;
  }>();
  const searchParams = useSearchParams();
  const serverUrl = searchParams.get("serverUrl") ?? "";
  const projectName = useProjectsStore(
    (store) =>
      store.projects.find((project) => project.id === projectId)?.name ??
      "Project",
  );
  const sessionEntry = useSessionsStore((store) =>
    store.sessions.find((entry) => entry.session.id === projectSessionId),
  );
  const accessToken = sessionEntry?.instance?.access_token ?? "";
  const opencodePassword = getOpencodePassword(sessionEntry?.instance?.config);
  const sessionName = sessionEntry?.session.name ?? "Session";
  const requestedDirectory = searchParams.get("directory") ?? undefined;
  const directories = useOpencodeProjectDirectories(
    projectSessionId,
    serverUrl,
    accessToken,
    opencodePassword,
    Boolean(serverUrl && accessToken && opencodePassword),
  );
  const directory = requestedDirectory ?? directories.data?.[0]?.worktree;

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

  const chatUrl = `/projects/${projectId}/sessions/${projectSessionId}`;

  return (
    <div className="relative flex min-h-0 w-full min-w-0 flex-1 overflow-x-hidden">
      <OpencodeChatTopBar
        projectId={projectId}
        projectSessionId={projectSessionId}
        chatUrl={chatUrl}
        serverUrl={serverUrl}
        accessToken={accessToken}
        password={opencodePassword}
        directory={directory}
      />
      <NewOpencodeChat
        chatId={projectSessionId}
        chatUrl={chatUrl}
        serverUrl={serverUrl}
        accessToken={accessToken}
        password={opencodePassword}
        directory={directory}
        projectName={projectName}
        sessionName={sessionName}
      />
    </div>
  );
}
