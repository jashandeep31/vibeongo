"use client";

import { OpencodeContextUsageMenu } from "@/components/chat/opencode-context-usage-menu";
import { OpencodeMcpMenu } from "@/components/chat/opencode-mcp-menu";
import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import { RuntimePulseMenu } from "@/components/runtime-pulse-menu";
import type { OpencodeInventory, OpencodeSessionData } from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import { FolderOpen, GitCompareArrows, RefreshCw, Settings2 } from "lucide-react";
import Link from "next/link";

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
      <RuntimePulseMenu projectSessionId={projectSessionId} />
      <ProjectDomainsDialog
        projectId={projectId}
        projectSessionId={projectSessionId}
        iconOnly
      />
    </div>
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
