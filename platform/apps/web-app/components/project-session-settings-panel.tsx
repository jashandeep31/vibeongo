"use client";

import { ProjectSessionSettingsPage } from "@/components/project-session-settings-page";
import { Button } from "@repo/ui/components/button";
import { Maximize2, Settings2, X } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

export const ProjectSessionSettingsPanel = memo(
  function ProjectSessionSettingsPanel({
    projectId,
    projectSessionId,
    sessionId,
    isActive,
    onClose,
    onOpenFiles,
    onOpenTerminal,
    onOpenDomains,
  }: {
    projectId: string;
    projectSessionId: string;
    sessionId?: string;
    isActive: boolean;
    onClose: () => void;
    onOpenFiles: () => void;
    onOpenTerminal: () => void;
    onOpenDomains: () => void;
  }) {
    const baseUrl = `/projects/${projectId}/sessions/${projectSessionId}`;
    const chatUrl = sessionId ? `${baseUrl}/chats/${sessionId}` : baseUrl;
    return (
      <aside
        aria-label="Runtime settings"
        className="bg-background flex h-full min-h-0 min-w-0 flex-col"
      >
        <header className="flex h-10 shrink-0 items-center gap-2 border-b px-2">
          <Settings2 className="size-4 shrink-0" />
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium">
            Runtime settings
          </h2>
          <Button asChild variant="ghost" size="icon-sm">
            <Link
              href={`${chatUrl}/settings`}
              aria-label="Open full settings page"
              title="Open full page"
            >
              <Maximize2 />
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close settings panel"
            title="Close settings"
          >
            <X />
          </Button>
        </header>
        <ProjectSessionSettingsPage
          key={`${projectId}:${projectSessionId}:${sessionId}`}
          projectId={projectId}
          projectSessionId={projectSessionId}
          sessionId={sessionId}
          mode="panel"
          isActive={isActive}
          onOpenFiles={onOpenFiles}
          onOpenTerminal={onOpenTerminal}
          onOpenDomains={onOpenDomains}
          onClose={onClose}
        />
      </aside>
    );
  },
);
