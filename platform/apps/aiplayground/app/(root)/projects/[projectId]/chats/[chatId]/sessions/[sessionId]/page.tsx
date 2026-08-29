"use client";

import { OpencodeSessionChat } from "@/components/chat/opencode-session-chat";
import { useGetInstances } from "@repo/api-hooks";
import { useOpencodeSession } from "@repo/api-hooks";
import { useSessionsStore } from "@repo/app-store";
import { getOpencodePassword } from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

export default function OpencodeSessionPage() {
  const { projectId, chatId, sessionId } = useParams<{
    projectId: string;
    chatId: string;
    sessionId: string;
  }>();
  const searchParams = useSearchParams();
  const requestedServerUrl = searchParams.get("serverUrl") ?? "";
  const storedInstance = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === chatId)?.instance,
  );
  const {
    data: instancesData,
    error: instanceError,
    isPending: isInstancePending,
  } = useGetInstances({ sessionId: chatId, state: "running", limit: 1 });
  const instance = instancesData?.data[0];
  const serverUrl =
    requestedServerUrl ||
    (instance ? `https://4096-${instance.id}${instance.proxy_domain}` : "");
  const accessToken =
    storedInstance?.access_token || instance?.access_token || "";
  const opencodePassword = getOpencodePassword(
    instance?.config ?? storedInstance?.config,
  );
  const { data, error, isFetching, isPending, isStreaming, resync } =
    useOpencodeSession({
      chatId,
      sessionId,
      serverUrl,
      accessToken,
      password: opencodePassword,
    });

  if (isInstancePending) {
    return <ChatSessionSkeleton />;
  }

  if (instanceError || !serverUrl || !accessToken || !opencodePassword) {
    return (
      <StatusScreen
        icon={<TriangleAlert className="text-destructive size-5" />}
        title="OpenCode server unavailable"
        description="This session is no longer running or its connection has expired."
        action
      />
    );
  }

  if (isPending) {
    return <ChatSessionSkeleton />;
  }

  if (error || !data) {
    return (
      <StatusScreen
        icon={<TriangleAlert className="text-destructive size-5" />}
        title="Could not load session"
        description={error?.message ?? "OpenCode returned no session data."}
        action
      />
    );
  }

  return (
    <OpencodeSessionChat
      projectId={projectId}
      chatId={chatId}
      sessionId={sessionId}
      serverUrl={serverUrl}
      accessToken={accessToken}
      password={opencodePassword}
      messages={data.messages}
      rawResponse={data}
      isStreaming={isStreaming}
      isRefreshing={isFetching}
      onRefresh={() => void resync()}
    />
  );
}

function StatusScreen({
  icon,
  title,
  description,
  action = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="bg-muted flex size-11 items-center justify-center rounded-full">
          {icon}
        </div>
        <div className="space-y-1">
          <h1 className="font-medium">{title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {action ? (
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ChatSessionSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      aria-label="Loading conversation"
      aria-busy="true"
    >
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
        <Skeleton className="size-8 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 overflow-hidden px-5 py-8">
        <div className="ml-auto flex w-3/4 flex-col items-end gap-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <div className="flex w-full gap-3">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="ml-auto flex w-2/3 flex-col items-end gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl shrink-0 px-5 pb-5">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}
