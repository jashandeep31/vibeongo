"use client";

import { OpencodeChatTopBar } from "@/components/chat/opencode-chat-top-bar";
import { OpencodeReviewPanel } from "@/components/chat/opencode-review-panel";
import {
  useGetInstances,
  useOpencodeLastTurnChanges,
  useOpencodeReviewProjectVcs,
  useOpencodeSession,
} from "@repo/api-hooks";
import { getOpencodePassword } from "@repo/api-client";
import { useSessionsStore } from "@repo/app-store";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const REVIEW_MODE_KEY = "vibeongo-opencode-review-mode";

export default function OpencodeReviewPage() {
  const { projectId, projectSessionId, opencodeSessionId } = useParams<{
    projectId: string;
    projectSessionId: string;
    opencodeSessionId: string;
  }>();
  const reviewModeKey = `${REVIEW_MODE_KEY}:${projectSessionId}:${opencodeSessionId}`;
  const [savedMode, setSavedMode] = useState<{
    key: string;
    mode: "working" | "last-turn";
  }>();
  useEffect(() => {
    let mode: "working" | "last-turn" = "working";
    try {
      if (window.localStorage.getItem(reviewModeKey) === "last-turn")
        mode = "last-turn";
    } catch {
      /* Storage may be unavailable. */
    }
    setSavedMode({ key: reviewModeKey, mode });
  }, [reviewModeKey]);
  const changeReviewMode = (mode: "working" | "last-turn") => {
    setSavedMode({ key: reviewModeKey, mode });
    try {
      window.localStorage.setItem(reviewModeKey, mode);
    } catch {
      /* Keep the selection for this visit. */
    }
  };
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
  const reviewVcs = useOpencodeReviewProjectVcs({
    chatId: projectSessionId,
    directory: data?.session.directory,
    serverUrl,
    accessToken,
    password,
  });
  const canReviewLastTurn = reviewVcs.data === "git";
  const reviewMode =
    canReviewLastTurn && savedMode?.key === reviewModeKey
      ? savedMode.mode
      : "working";
  const lastTurnQuery = useOpencodeLastTurnChanges({
    chatId: projectSessionId,
    sessionId: opencodeSessionId,
    serverUrl,
    accessToken,
    password,
    enabled: reviewMode === "last-turn",
  });
  const { refetch: refetchLastTurn } = lastTurnQuery;
  // Refresh snapshots after another client or the live event stream updates this session.
  useEffect(() => {
    if (reviewMode === "last-turn" && data?.session.time.updated)
      void refetchLastTurn();
  }, [
    reviewMode,
    data?.session.time.updated,
    data?.status.type,
    refetchLastTurn,
  ]);
  const refreshChanges = () => {
    void resync();
    if (reviewMode === "last-turn") void refetchLastTurn();
  };
  const refreshingChanges =
    isFetching || (reviewMode === "last-turn" && lastTurnQuery.isFetching);
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
    <div className="bg-background text-foreground relative flex h-svh min-h-0 flex-col">
      <OpencodeChatTopBar
        projectId={projectId}
        projectSessionId={projectSessionId}
        chatUrl={chatUrl}
        serverUrl={serverUrl}
        accessToken={accessToken}
        password={password}
        directory={data.session.directory}
        session={data}
        isRefreshing={refreshingChanges}
        onRefresh={refreshChanges}
      />
      <main className="min-h-0 flex-1">
        <OpencodeReviewPanel
          gitConnection={{ chatId: projectSessionId, directory: data.session.directory, serverUrl, accessToken, password }}
          changes={
            reviewMode === "last-turn"
              ? (lastTurnQuery.data ?? [])
              : data.changes
          }
          mode={reviewMode}
          onModeChange={canReviewLastTurn ? changeReviewMode : undefined}
          changesError={
            reviewMode === "last-turn"
              ? lastTurnQuery.error?.message
              : undefined
          }
          chatUrl={chatUrl}
          isRefreshing={refreshingChanges}
          onRefresh={refreshChanges}
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
        <Skeleton className="hidden h-full w-72 md:block" />
        <Skeleton className="h-full flex-1" />
      </div>
    </div>
  );
}
