"use client";

import { OpencodeContextUsageMenu } from "@/components/chat/opencode-context-usage-menu";
import { OpencodeMcpMenu } from "@/components/chat/opencode-mcp-menu";
import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import { RuntimePulseMenu } from "@/components/runtime-pulse-menu";
import {
  useExportOpencodeSession,
  useForkOpencodeSession,
} from "@repo/api-hooks";
import {
  getOpencodeSessionExportFilename,
  getOpencodeUserMessage,
  type OpencodeInventory,
  type OpencodeSessionData,
} from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Download,
  Ellipsis,
  FolderOpen,
  GitCompareArrows,
  GitFork,
  Loader2,
  RefreshCw,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
  inventory,
  isRefreshing = false,
  onRefresh,
  reviewActive = false,
}: {
  projectId: string;
  projectSessionId: string;
  chatUrl: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
  directory?: string;
  session?: OpencodeSessionData;
  inventory?: OpencodeInventory;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  reviewActive?: boolean;
}) {
  return (
    <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
      {session ? (
        <Button
          asChild
          type="button"
          variant={reviewActive ? "secondary" : "outline"}
          size="icon-sm"
          className="bg-background/90 relative shadow-sm backdrop-blur"
        >
          <Link
            href={`${chatUrl}/review`}
            aria-label="Review changes"
            title="Review changes"
            aria-current={reviewActive ? "page" : undefined}
          >
            <GitCompareArrows />
            {session.changes.length > 0 ? (
              <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 tabular-nums">
                {session.changes.length > 99 ? "99+" : session.changes.length}
              </span>
            ) : null}
          </Link>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="bg-background/90 shadow-sm backdrop-blur"
          aria-label="Review changes"
          title="Review changes are available after the chat starts"
          disabled
        >
          <GitCompareArrows />
        </Button>
      )}
      <TopBarLink href={`${chatUrl}/files`} label="Open files">
        <FolderOpen />
      </TopBarLink>
      <TopBarLink href={`${chatUrl}/settings`} label="Runtime settings">
        <Settings2 />
      </TopBarLink>
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
        <OpencodeContextUsageMenu session={session} inventory={inventory} />
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
      <ProjectDomainsDialog
        projectId={projectId}
        projectSessionId={projectSessionId}
        iconOnly
      />
    </div>
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
  const [forkOpen, setForkOpen] = useState(false);
  const fork = useForkOpencodeSession({
    chatId: projectSessionId,
    sessionId: session.session.id,
    serverUrl,
    accessToken,
    password,
  });
  const exportSession = useExportOpencodeSession({
    chatId: projectSessionId,
    sessionId: session.session.id,
    serverUrl,
    accessToken,
    password,
  });
  const forkable = useMemo(() => {
    const userMessages = session.messages.filter(
      (message) => message.info.role === "user",
    );

    return userMessages.flatMap((message, index) => {
      const text = getOpencodeUserMessage(
        message.parts,
        message.info.role === "user" ? message.info.metadata : undefined,
      ).text;
      const hasCompletedAnswer = session.messages.some(
        (candidate) =>
          candidate.info.role === "assistant" &&
          candidate.info.parentID === message.info.id &&
          Boolean(candidate.info.time.completed),
      );
      if (!text || !hasCompletedAnswer) return [];

      return [
        {
          id: message.info.id,
          text,
          created: message.info.time.created,
          before: userMessages[index + 1]?.info.id,
        },
      ];
    });
  }, [session.messages]);

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

  const handleFork = (before?: string) => {
    fork.mutate(before, {
      onSuccess: (forked) => {
        setForkOpen(false);
        const target = chatUrl.replace(
          /\/chats\/[^/]+$/,
          `/chats/${forked.id}`,
        );
        const params = new URLSearchParams({ serverUrl });
        router.push(`${target}?${params.toString()}`);
      },
      onError: (error) =>
        toast.error(error.message || "Could not fork session"),
    });
  };

  return (
    <>
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
            {fork.isPending || exportSession.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Ellipsis />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={!forkable.length || fork.isPending}
            onSelect={() => setForkOpen(true)}
          >
            <GitFork /> Fork session
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={exportSession.isPending}
            onSelect={handleExport}
          >
            <Download /> Export JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CommandDialog
        open={forkOpen}
        onOpenChange={setForkOpen}
        title="Fork session"
        description="Choose an answer to include in the new fork."
        className="sm:max-w-md"
      >
        <Command>
          <CommandInput placeholder="Search messages…" />
          <CommandList>
            <CommandEmpty>No completed messages found.</CommandEmpty>
            <CommandGroup heading="Fork through answer">
              {[...forkable].reverse().map((message) => (
                <CommandItem
                  key={message.id}
                  value={`${message.text} ${message.created}`}
                  disabled={fork.isPending}
                  onSelect={() => handleFork(message.before)}
                  className="items-start py-2.5 [&>svg:last-child]:hidden"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm">{message.text}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {new Date(message.created).toLocaleString()}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
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
