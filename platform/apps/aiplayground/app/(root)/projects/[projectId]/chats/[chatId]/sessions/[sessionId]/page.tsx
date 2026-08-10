"use client";

import { OpencodeSessionChat } from "@/components/chat/opencode-session-chat";
import { useGetInstances } from "@/hooks/use-instance";
import { useOpencodeSession } from "@/hooks/use-opencode-session";
import { useSessionsStore } from "@/store/playground-store";
import { getOpencodePassword } from "@/services/opencode-services";
import { Button } from "@repo/ui/components/button";
import { Loader2, TriangleAlert } from "lucide-react";
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
    return (
      <StatusScreen
        icon={<Loader2 className="text-muted-foreground size-5 animate-spin" />}
        title="Connecting to OpenCode"
        description="Checking the running sandbox for this session."
      />
    );
  }

  if (instanceError || !serverUrl || !accessToken) {
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
    return (
      <StatusScreen
        title="Loading session"
        description="Fetching your OpenCode conversation."
      />
    );
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
  icon = <Loader2 className="text-muted-foreground size-5" />,
  title,
  description,
  action = false,
}: {
  icon?: React.ReactNode;
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
