"use client";

import { OpencodeContextPanel } from "@/components/chat/opencode-context-panel";
import { NewOpencodeChat } from "@/components/chat/new-opencode-chat";
import { OpencodeChatTopBar } from "@/components/chat/opencode-chat-top-bar";
import { ProjectSessionFilesPanel } from "@/components/project-session-files-page";
import { ProjectTerminalPanel } from "@/components/project-terminal-panel";
import { WorkspaceResizableLayout } from "@/components/workspace-resizable-layout";
import { useOpencodeWorkingChanges } from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import {
  Files,
  Gauge,
  GitCompareArrows,
  Globe,
  Settings2,
  Terminal,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

const loadingPanel = () => (
  <p role="status" className="text-muted-foreground p-4 text-sm">
    Loading panel…
  </p>
);

const OpencodeReviewPanel = dynamic(
  () =>
    import("@/components/chat/opencode-review-panel").then(
      (module) => module.OpencodeReviewPanel,
    ),
  { ssr: false, loading: loadingPanel },
);
const ProjectBrowserPanel = dynamic(
  () =>
    import("@/components/project-browser-panel").then(
      (module) => module.ProjectBrowserPanel,
    ),
  { ssr: false, loading: loadingPanel },
);
const ProjectSessionSettingsPanel = dynamic(
  () =>
    import("@/components/project-session-settings-panel").then(
      (module) => module.ProjectSessionSettingsPanel,
    ),
  { ssr: false, loading: loadingPanel },
);

type Panel = "context" | "files" | "git" | "terminal" | "browser" | "settings";
const TOOLS = [
  { id: "context", label: "Context", icon: Gauge },
  { id: "files", label: "Files", icon: Files },
  { id: "git", label: "Git changes", icon: GitCompareArrows },
  { id: "terminal", label: "Terminals", icon: Terminal },
  { id: "browser", label: "Browser", icon: Globe },
  { id: "settings", label: "Runtime settings", icon: Settings2 },
] as const;

export function NewOpencodeWorkspace({
  projectId,
  projectSessionId,
  serverUrl,
  accessToken,
  password,
  directory,
  projectName,
  sessionName,
  directoryError,
}: {
  projectId: string;
  projectSessionId: string;
  serverUrl: string;
  accessToken: string;
  password: string;
  directory?: string;
  projectName: string;
  sessionName: string;
  directoryError?: string;
}) {
  const [active, setActive] = useState<Panel | null>(null);
  const [opened, setOpened] = useState<Partial<Record<Panel, boolean>>>({});
  const [isWorktreeOpen, setIsWorktreeOpen] = useState(false);
  const [filesDirty, setFilesDirty] = useState(false);
  const previousPanel = useRef<Panel | null>(null);
  const buttons = useRef<Partial<Record<Panel, HTMLButtonElement | null>>>({});
  const chatUrl = `/projects/${projectId}/sessions/${projectSessionId}`;
  const changes = useOpencodeWorkingChanges({
    chatId: projectSessionId,
    serverUrl,
    accessToken,
    password,
    directory,
    enabled: active === "git",
  });
  const closePanel = useCallback(() => setActive(null), []);
  const openPanel = useCallback((panel: Panel) => {
    setOpened((previous) => ({ ...previous, [panel]: true }));
    setActive(panel);
  }, []);
  const openFiles = useCallback(() => openPanel("files"), [openPanel]);
  const openTerminal = useCallback(() => openPanel("terminal"), [openPanel]);
  const openWorktrees = useCallback(() => setIsWorktreeOpen(true), []);
  const togglePanel = (panel: Panel) => {
    if (active !== panel) {
      openPanel(panel);
      return;
    }
    if (panel === "files" && filesDirty) {
      if (!window.confirm("Discard your unsaved file changes?")) return;
      setOpened((previous) => ({ ...previous, files: false }));
      setFilesDirty(false);
    }
    closePanel();
  };
  useEffect(() => {
    if (!active && previousPanel.current)
      buttons.current[previousPanel.current]?.focus();
    previousPanel.current = active;
  }, [active]);

  const sidebar = (
    <>
      {opened.context && (
        <div
          className={active === "context" ? "h-full" : "hidden"}
          aria-hidden={active !== "context"}
        >
          <OpencodeContextPanel onClose={closePanel} />
        </div>
      )}
      {opened.files && (
        <div
          className={active === "files" ? "h-full" : "hidden"}
          aria-hidden={active !== "files"}
        >
          <ProjectSessionFilesPanel
            isActive={active === "files"}
            projectId={projectId}
            projectSessionId={projectSessionId}
            onClose={closePanel}
            onDirtyChange={setFilesDirty}
          />
        </div>
      )}
      {opened.git && (
        <div
          className={active === "git" ? "h-full" : "hidden"}
          aria-hidden={active !== "git"}
        >
          <OpencodeReviewPanel
            changes={changes.data ?? []}
            chatUrl={chatUrl}
            isActive={active === "git"}
            isRefreshing={changes.isFetching}
            changesError={
              !directory
                ? directoryError ||
                  "Choose a worktree to review its Git changes."
                : changes.error?.message
            }
            onRefresh={directory ? () => void changes.refetch() : undefined}
            onClose={closePanel}
          />
        </div>
      )}
      {opened.terminal && (
        <div
          className={active === "terminal" ? "h-full" : "hidden"}
          aria-hidden={active !== "terminal"}
        >
          <ProjectTerminalPanel
            projectId={projectId}
            projectSessionId={projectSessionId}
            isActive={active === "terminal"}
            onClose={closePanel}
          />
        </div>
      )}
      {opened.browser && (
        <div
          className={active === "browser" ? "h-full" : "hidden"}
          aria-hidden={active !== "browser"}
        >
          <ProjectBrowserPanel
            projectId={projectId}
            projectSessionId={projectSessionId}
            isActive={active === "browser"}
            onClose={closePanel}
          />
        </div>
      )}
      {opened.settings && (
        <div
          className={active === "settings" ? "h-full" : "hidden"}
          aria-hidden={active !== "settings"}
        >
          <ProjectSessionSettingsPanel
            projectId={projectId}
            projectSessionId={projectSessionId}
            isActive={active === "settings"}
            onClose={closePanel}
            onOpenFiles={openFiles}
            onOpenTerminal={openTerminal}
          />
        </div>
      )}
    </>
  );

  return (
    <div className="bg-background text-foreground flex h-svh min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <OpencodeChatTopBar
        projectId={projectId}
        projectSessionId={projectSessionId}
        title={`${projectName} · ${sessionName}`}
        chatUrl={chatUrl}
        serverUrl={serverUrl}
        accessToken={accessToken}
        password={password}
        directory={directory}
        showSettings={false}
        showDomains={false}
        worktreeOpen={isWorktreeOpen}
        onWorktreeOpenChange={setIsWorktreeOpen}
      />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <WorkspaceResizableLayout sidebar={sidebar} isOpen={active !== null}>
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            {directoryError && (
              <p role="alert" className="text-destructive px-4 py-2 text-sm">
                Could not load worktrees: {directoryError}. You can retry from
                the worktree menu.
              </p>
            )}
            <NewOpencodeChat
              chatId={projectSessionId}
              chatUrl={chatUrl}
              serverUrl={serverUrl}
              accessToken={accessToken}
              password={password}
              directory={directory}
              projectName={projectName}
              sessionName={sessionName}
              onOpenWorktrees={openWorktrees}
            />
          </div>
        </WorkspaceResizableLayout>
        <nav
          aria-label="Session workspace"
          className="bg-background z-[60] flex w-12 shrink-0 flex-col items-center gap-1 border-l py-2"
        >
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              ref={(node) => {
                buttons.current[id] = node;
              }}
              type="button"
              size="icon-sm"
              variant={active === id ? "secondary" : "ghost"}
              aria-label={`${active === id ? "Close" : "Open"} ${label.toLowerCase()} panel`}
              aria-pressed={active === id}
              title={label}
              onClick={() => togglePanel(id)}
            >
              <Icon />
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
}
