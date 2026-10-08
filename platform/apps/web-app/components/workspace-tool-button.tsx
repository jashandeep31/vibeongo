"use client";

import type { Ref } from "react";
import {
  AppWindow,
  FolderTree,
  Gauge,
  GitBranch,
  Globe,
  Settings,
  SquareTerminal,
} from "lucide-react";
import { useOpencodeWorkingChanges } from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import type { WorkspaceTool } from "@/hooks/use-workspace-tool";

const ICONS = {
  context: Gauge,
  files: FolderTree,
  git: GitBranch,
  terminal: SquareTerminal,
  domains: Globe,
  browser: AppWindow,
  settings: Settings,
} satisfies Record<WorkspaceTool, typeof Gauge>;

export function WorkspaceToolIcon({ tool }: { tool: WorkspaceTool }) {
  const Icon = ICONS[tool];
  return (
    <Icon
      aria-hidden="true"
      className={
        tool === "settings"
          ? "transition-transform duration-300 group-hover:rotate-90 group-focus-visible:rotate-90 group-aria-pressed:rotate-90 motion-reduce:transform-none motion-reduce:transition-none"
          : undefined
      }
    />
  );
}

export function WorkspaceGitButton({
  connection,
  isOpen,
  onClick,
  buttonRef,
}: {
  connection: {
    chatId: string;
    directory?: string;
    serverUrl: string;
    accessToken: string;
    password?: string;
  };
  isOpen: boolean;
  onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const changes = useOpencodeWorkingChanges({
    ...connection,
    refetchInterval: 15_000,
  });
  const count = changes.isError ? undefined : changes.data?.length;
  const countLabel =
    count === undefined
      ? ""
      : `, ${count} changed ${count === 1 ? "file" : "files"}`;
  return (
    <Button
      ref={buttonRef}
      type="button"
      variant={isOpen ? "secondary" : "ghost"}
      size="icon-sm"
      className="relative"
      aria-label={`${isOpen ? "Close" : "Open"} Git changes${countLabel}`}
      aria-pressed={isOpen}
      title={`Git changes${countLabel}`}
      onClick={onClick}
    >
      <WorkspaceToolIcon tool="git" />
      {count !== undefined ? (
        <span
          aria-hidden="true"
          className="bg-primary text-primary-foreground pointer-events-none absolute right-0 bottom-0 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] leading-none font-medium tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Button>
  );
}
