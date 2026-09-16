"use client";

import { OpencodeChatTopBar } from "@/components/chat/opencode-chat-top-bar";
import { OpencodeReviewPanel } from "@/components/chat/opencode-review-panel";
import {
  useGetInstances,
  useOpencodeInventory,
  useOpencodeSession,
} from "@repo/api-hooks";
import { getOpencodePassword } from "@repo/api-client";
import { useSessionsStore } from "@repo/app-store";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

export default function OpencodeReviewPage() {
  const { projectId, projectSessionId, opencodeSessionId } = useParams<{
    projectId: string;
    projectSessionId: string;
    opencodeSessionId: string;
  }>();
  const searchParams = useSearchParams();
  const requestedServerUrl = searchParams.get("serverUrl") ?? "";
  const storedInstance = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === projectSessionId)
        ?.instance,
  );
  const {
    data: instancesData,
    error: instanceError,
    isPending: isInstancePending,
  } = useGetInstances({
    sessionId: projectSessionId,
    state: "running",
    limit: 1,
  });
  const instance = instancesData?.data[0];
  const serverUrl =
    requestedServerUrl ||
    (instance ? `https://4096-${instance.id}${instance.proxy_domain}` : "");
  const accessToken =
    storedInstance?.access_token || instance?.access_token || "";
  const password = getOpencodePassword(
    instance?.config ?? storedInstance?.config,
  );
  const { data, error, isFetching, isPending, resync } = useOpencodeSession({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl,
    accessToken,
    password,
  });
  const inventoryQuery = useOpencodeInventory(
    projectSessionId,
    serverUrl,
    accessToken,
    password,
  );
  const chatUrl = `/projects/${projectId}/sessions/${projectSessionId}/chats/${opencodeSessionId}`;

  if (isInstancePending || isPending) return <ReviewSkeleton />;

  if (
    instanceError ||
    error ||
    !serverUrl ||
    !accessToken ||
    !password ||
    !data
  ) {
    return (
      <div className="flex h-svh items-center justify-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="bg-muted flex size-11 items-center justify-center rounded-full">
            <TriangleAlert className="text-destructive size-5" />
          </div>
          <div className="space-y-1">
            <h1 className="font-medium">Could not load changes</h1>
            <p className="text-muted-foreground text-sm">
              {error?.message ??
                instanceError?.message ??
                "The OpenCode server is unavailable."}
            </p>
          </div>
          <Button asChild>
            <Link href={chatUrl}>Back to chat</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground relative flex h-svh min-h-0 flex-col pt-14">
      <OpencodeChatTopBar
        projectId={projectId}
        projectSessionId={projectSessionId}
        chatUrl={chatUrl}
        serverUrl={serverUrl}
        accessToken={accessToken}
        password={password}
        directory={data.session.directory}
        session={data}
        inventory={inventoryQuery.data}
        isRefreshing={isFetching}
        onRefresh={() => void resync()}
        reviewActive
      />
      <main className="min-h-0 flex-1">
        <OpencodeReviewPanel
          changes={data.changes}
          chatUrl={chatUrl}
          isRefreshing={isFetching}
          onRefresh={() => void resync()}
        />
      </main>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="flex h-svh min-h-0 flex-col p-4 pt-16" aria-busy="true">
      <div className="border-border flex h-14 items-center gap-3 border-b px-3">
        <Skeleton className="size-5" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-4 pt-4">
        <Skeleton className="hidden h-full w-64 md:block" />
        <Skeleton className="h-full flex-1" />
      </div>
    </div>
  );
}
