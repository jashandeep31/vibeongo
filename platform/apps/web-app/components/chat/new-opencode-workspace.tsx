"use client";

import { OpencodeContextPanel } from "@/components/chat/opencode-context-panel";
import {
  useWorkspaceTool,
  type WorkspaceTool,
} from "@/hooks/use-workspace-tool";
import { NewOpencodeChat } from "@/components/chat/new-opencode-chat";
import { OpencodeChatTopBar } from "@/components/chat/opencode-chat-top-bar";
import { WorkspacePanel } from "@/components/workspace-panel";
import {
  WorkspaceResizableLayout,
  WorkspaceToolRail,
} from "@/components/workspace-resizable-layout";
import {
  WorkspaceGitButton,
  WorkspaceToolIcon,
} from "@/components/workspace-tool-button";
import { useOpencodeWorkingChanges } from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
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
const ProjectDomainsPanel = dynamic(
  () =>
    import("@/components/project-domains-panel").then(
      (module) => module.ProjectDomainsPanel,
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

type Panel = WorkspaceTool;
const TOOLS = [
  { id: "context", label: "Context" },
  { id: "files", label: "Files" },
  { id: "git", label: "Git changes" },
  { id: "terminal", label: "Terminals" },
  { id: "domains", label: "Domains" },
  { id: "browser", label: "Browser" },
  { id: "settings", label: "Runtime settings" },
] as const;

const ProjectSessionFilesPanel = dynamic(
  () =>
    import("@/components/project-session-files-page").then(
      (module) => module.ProjectSessionFilesPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="text-muted-foreground p-4 text-sm">
        Loading tool…
      </p>
    ),
  },
);

const ProjectTerminalPanel = dynamic(
  () =>
    import("@/components/project-terminal-panel").then(
      (module) => module.ProjectTerminalPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="text-muted-foreground p-4 text-sm">
        Loading tool…
      </p>
    ),
  },
);

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
  const { active, opened, openPanel, closePanel } = useWorkspaceTool();
  const [isWorktreeOpen, setIsWorktreeOpen] = useState(false);
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
  const openFiles = useCallback(() => openPanel("files"), [openPanel]);
  const openDomains = useCallback(() => openPanel("domains"), [openPanel]);
  const openTerminal = useCallback(() => openPanel("terminal"), [openPanel]);
  const openWorktrees = useCallback(() => setIsWorktreeOpen(true), []);
  const togglePanel = (panel: Panel) => {
    if (active !== panel) {
      openPanel(panel);
      return;
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
        <WorkspacePanel isActive={active === "context"} onClose={closePanel}>
          <OpencodeContextPanel onClose={closePanel} />
        </WorkspacePanel>
      )}
      {opened.files && (
        <WorkspacePanel isActive={active === "files"} onClose={closePanel}>
          <ProjectSessionFilesPanel
            isActive={active === "files"}
            projectId={projectId}
            projectSessionId={projectSessionId}
            onClose={closePanel}
          />
        </WorkspacePanel>
      )}
      {opened.git && (
        <WorkspacePanel isActive={active === "git"} onClose={closePanel}>
          <OpencodeReviewPanel
            gitConnection={{
              chatId: projectSessionId,
              directory,
              serverUrl,
              accessToken,
              password,
            }}
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
        </WorkspacePanel>
      )}
      {opened.terminal && (
        <WorkspacePanel isActive={active === "terminal"} onClose={closePanel}>
          <ProjectTerminalPanel
            projectId={projectId}
            projectSessionId={projectSessionId}
            isActive={active === "terminal"}
            onClose={closePanel}
          />
        </WorkspacePanel>
      )}
      {opened.domains && (
        <WorkspacePanel isActive={active === "domains"} onClose={closePanel}>
          <ProjectDomainsPanel
            projectId={projectId}
            projectSessionId={projectSessionId}
            isActive={active === "domains"}
            onClose={closePanel}
          />
        </WorkspacePanel>
      )}
      {opened.browser && (
        <WorkspacePanel isActive={active === "browser"} onClose={closePanel}>
          <ProjectBrowserPanel
            projectId={projectId}
            projectSessionId={projectSessionId}
            isActive={active === "browser"}
            onOpenDomains={openDomains}
            onClose={closePanel}
          />
        </WorkspacePanel>
      )}
      {opened.settings && (
        <WorkspacePanel isActive={active === "settings"} onClose={closePanel}>
          <ProjectSessionSettingsPanel
            projectId={projectId}
            projectSessionId={projectSessionId}
            isActive={active === "settings"}
            onClose={closePanel}
            onOpenFiles={openFiles}
            onOpenTerminal={openTerminal}
            onOpenDomains={openDomains}
          />
        </WorkspacePanel>
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
        <WorkspaceToolRail>
          {TOOLS.map(({ id, label }) =>
            id === "git" ? (
              <WorkspaceGitButton
                key={id}
                buttonRef={(node) => {
                  buttons.current.git = node;
                }}
                connection={{
                  chatId: projectSessionId,
                  directory,
                  serverUrl,
                  accessToken,
                  password,
                }}
                isOpen={active === "git"}
                onClick={() => togglePanel("git")}
              />
            ) : (
              <Button
                key={id}
                ref={(node) => {
                  buttons.current[id] = node;
                }}
                type="button"
                className="group"
                size="icon-sm"
                variant={active === id ? "secondary" : "ghost"}
                aria-label={`${active === id ? "Close" : "Open"} ${label.toLowerCase()} panel`}
                aria-pressed={active === id}
                title={label}
                onClick={() => togglePanel(id)}
              >
                <WorkspaceToolIcon tool={id} />
              </Button>
            ),
          )}
        </WorkspaceToolRail>
      </div>
    </div>
  );
}
