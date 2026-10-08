"use client";

import { NewOpencodeWorkspace } from "@/components/chat/new-opencode-workspace";
import {
  useGetInstances,
  useOpencodeProjectDirectories,
} from "@repo/api-hooks";
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
  const requestedServerUrl = searchParams.get("serverUrl") ?? "";
  const projectName = useProjectsStore(
    (store) =>
      store.projects.find((project) => project.id === projectId)?.name ??
      "Project",
  );
  const sessionEntry = useSessionsStore((store) =>
    store.sessions.find((entry) => entry.session.id === projectSessionId),
  );
  const instancesQuery = useGetInstances(
    { sessionId: projectSessionId, state: "running", limit: 1 },
    !sessionEntry?.instance,
  );
  const instance = sessionEntry?.instance ?? instancesQuery.data?.data[0];
  const serverUrl =
    requestedServerUrl ||
    (instance ? `https://4096-${instance.id}${instance.proxy_domain}` : "");
  const accessToken = instance?.access_token ?? "";
  const opencodePassword = getOpencodePassword(instance?.config);
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
  if (!instance && instancesQuery.isPending) {
    return (
      <div
        role="status"
        className="text-muted-foreground flex h-svh items-center justify-center text-sm"
      >
        Connecting to your runtime…
      </div>
    );
  }

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

  return (
    <NewOpencodeWorkspace
      projectId={projectId}
      projectSessionId={projectSessionId}
      serverUrl={serverUrl}
      accessToken={accessToken}
      password={opencodePassword}
      directory={directory}
      projectName={projectName}
      sessionName={sessionName}
      directoryError={directories.error?.message}
    />
  );
}
