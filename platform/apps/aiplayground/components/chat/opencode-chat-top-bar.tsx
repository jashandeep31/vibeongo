"use client";

import { OpencodeContextUsageMenu } from "@/components/chat/opencode-context-usage-menu";
import { OpencodeMcpMenu } from "@/components/chat/opencode-mcp-menu";
import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import { RuntimePulseMenu } from "@/components/runtime-pulse-menu";
import type { OpencodeInventory, OpencodeSessionData } from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import { FolderOpen, RefreshCw, Settings2 } from "lucide-react";
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
}) {
  return (
    <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
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
