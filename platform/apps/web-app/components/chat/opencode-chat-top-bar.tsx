"use client";

import { OpencodeMcpMenu } from "@/components/chat/opencode-mcp-menu";
import { OpencodeWorktreeDialog } from "@/components/chat/opencode-worktree-dialog";
import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import { RuntimePulseMenu } from "@/components/runtime-pulse-menu";
import { useExportOpencodeSession } from "@repo/api-hooks";
import {
  getOpencodeSessionExportFilename,
  type OpencodeSessionData,
} from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  ArrowUpLeft,
  Download,
  Ellipsis,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function OpencodeChatTopBar({
  projectId,
  projectSessionId,
  chatUrl,
  serverUrl,
  accessToken,
  password,
  directory,
  session,
  isRefreshing = false,
  onRefresh,
  title,
  showSettings = true,
  showDomains = true,
  worktreeOpen,
  onWorktreeOpenChange,
}: {
  projectId: string;
  projectSessionId: string;
  chatUrl: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
  directory?: string;
  session?: OpencodeSessionData;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  title?: string;
  showSettings?: boolean;
  showDomains?: boolean;
  worktreeOpen?: boolean;
  onWorktreeOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [ownWorktreeOpen, setOwnWorktreeOpen] = useState(false);
  const isWorktreeOpen = worktreeOpen ?? ownWorktreeOpen;
  const setWorktreeOpen = onWorktreeOpenChange ?? setOwnWorktreeOpen;
  const sessionTitle =
    title || session?.session.title || session?.session.slug || "OpenCode chat";
  const newChatParams = new URLSearchParams({ serverUrl });
  if (directory) newChatParams.set("directory", directory);
  const newChatUrl = `/projects/${projectId}/sessions/${projectSessionId}?${newChatParams.toString()}`;
  const openChatInDirectory = (nextDirectory: string) => {
    setWorktreeOpen(false);
    const params = new URLSearchParams({ serverUrl, directory: nextDirectory });
    router.push(
      `/projects/${projectId}/sessions/${projectSessionId}?${params.toString()}`,
    );
  };

  return (
    <header className="bg-background relative z-50 flex h-12 w-full shrink-0 items-center gap-3 border-b px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <h1
          className="min-w-0 truncate text-sm font-semibold"
          title={sessionTitle}
        >
          {sessionTitle}
        </h1>
        <Button
          asChild
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 shrink-0 gap-1.5 rounded-md px-2 text-xs font-medium sm:px-2.5"
        >
          <Link href={newChatUrl} aria-label="New chat" title="New chat">
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">New chat</span>
          </Link>
        </Button>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <OpencodeWorktreeDialog
          connection={{
            chatId: projectSessionId,
            serverUrl,
            accessToken,
            password,
          }}
          currentDirectory={directory}
          open={isWorktreeOpen}
          onOpenChange={setWorktreeOpen}
          onSelect={openChatInDirectory}
        />
        {onRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="bg-background/90 shadow-sm backdrop-blur"
            aria-label="Refresh chat events"
            title="Refresh chat events"
            disabled={isRefreshing}
            onClick={onRefresh}
          >
            <RefreshCw className={isRefreshing ? "animate-spin" : undefined} />
          </Button>
        ) : null}
        {directory ? (
          <OpencodeMcpMenu
            connection={{
              chatId: projectSessionId,
              serverUrl,
              accessToken,
              password,
              directory,
            }}
          />
        ) : null}
        {session ? (
          <OpencodeSessionActions
            chatUrl={chatUrl}
            projectSessionId={projectSessionId}
            serverUrl={serverUrl}
            accessToken={accessToken}
            password={password}
            session={session}
          />
        ) : null}
        <RuntimePulseMenu projectSessionId={projectSessionId} />
        {showDomains ? (
          <ProjectDomainsDialog
            projectId={projectId}
            projectSessionId={projectSessionId}
            iconOnly
          />
        ) : null}
        {showSettings ? (
          <TopBarLink href={`${chatUrl}/settings`} label="Runtime settings">
            <Settings />
          </TopBarLink>
        ) : null}
      </div>
    </header>
  );
}

function OpencodeSessionActions({
  chatUrl,
  projectSessionId,
  serverUrl,
  accessToken,
  password,
  session,
}: {
  chatUrl: string;
  projectSessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
  session: OpencodeSessionData;
}) {
  const router = useRouter();
  const openSession = (sessionId: string) => {
    const target = chatUrl.replace(/\/chats\/[^/]+$/, `/chats/${sessionId}`);
    const params = new URLSearchParams({ serverUrl });
    router.push(`${target}?${params.toString()}`);
  };
  const exportSession = useExportOpencodeSession({
    chatId: projectSessionId,
    sessionId: session.session.id,
    serverUrl,
    accessToken,
    password,
  });
  const handleExport = () => {
    exportSession.mutate(undefined, {
      onSuccess: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = getOpencodeSessionExportFilename(session.session);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      },
      onError: (error) =>
        toast.error(error.message || "Could not export session"),
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="bg-background/90 shadow-sm backdrop-blur"
          aria-label="Session actions"
          title="Session actions"
        >
          {exportSession.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Ellipsis />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {session.session.parentID ? (
          <DropdownMenuItem
            onSelect={() => openSession(session.session.parentID!)}
          >
            <ArrowUpLeft /> Open parent chat
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          disabled={exportSession.isPending}
          onSelect={handleExport}
        >
          <Download /> Export JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBarLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      asChild
      type="button"
      variant="outline"
      size="icon-sm"
      className="bg-background/90 shadow-sm backdrop-blur"
    >
      <Link href={href} aria-label={label} title={label}>
        {children}
      </Link>
    </Button>
  );
}
