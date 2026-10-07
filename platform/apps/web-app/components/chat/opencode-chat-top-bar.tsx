"use client";

import { OpencodeMcpMenu } from "@/components/chat/opencode-mcp-menu";
import { OpencodeWorktreeDialog } from "@/components/chat/opencode-worktree-dialog";
import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import { RuntimePulseMenu } from "@/components/runtime-pulse-menu";
import {
  useExportOpencodeSession,
  useSendOpencodePrompt,
} from "@repo/api-hooks";
import {
  buildOpencodeSubtaskPrompt,
  getOpencodeSessionExportFilename,
  type OpencodeInventory,
  type OpencodeSessionData,
} from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Textarea } from "@repo/ui/components/textarea";
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
  GitBranch,
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
  inventory,
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
  inventory?: OpencodeInventory;
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
            inventory={inventory}
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
  inventory,
}: {
  chatUrl: string;
  projectSessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
  session: OpencodeSessionData;
  inventory?: OpencodeInventory;
}) {
  const router = useRouter();
  const [subtaskOpen, setSubtaskOpen] = useState(false);
  const [subtaskPrompt, setSubtaskPrompt] = useState("");
  const [subtaskAgent, setSubtaskAgent] = useState("");
  const [subtaskBackground, setSubtaskBackground] = useState(false);
  const availableSubagents =
    inventory?.agents.filter((agent) => agent.mode !== "primary") ?? [];
  const startSubtask = useSendOpencodePrompt({
    chatId: projectSessionId,
    sessionId: session.session.id,
    serverUrl,
    accessToken,
    password,
  });
  const openSession = (sessionId: string) => {
    const target = chatUrl.replace(/\/chats\/[^/]+$/, `/chats/${sessionId}`);
    const params = new URLSearchParams({ serverUrl });
    router.push(`${target}?${params.toString()}`);
  };
  const handleStartSubtask = () => {
    const text = subtaskPrompt.trim();
    if (!text || startSubtask.isPending) return;
    startSubtask.mutate(
      {
        text: buildOpencodeSubtaskPrompt(text, {
          ...(subtaskAgent ? { agent: subtaskAgent } : {}),
          background: subtaskBackground,
        }),
        displayText: `Delegate to ${subtaskAgent || "a subagent"}${subtaskBackground ? " in the background" : ""}:\n${text}`,
        files: [],
        selection: {},
      },
      {
        onSuccess: () => {
          setSubtaskOpen(false);
          setSubtaskPrompt("");
          openSession(session.session.id);
          toast.success("Subtask delegation requested");
        },
        onError: (error) =>
          toast.error(error.message || "Could not request subtask"),
      },
    );
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
            {exportSession.isPending || startSubtask.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Ellipsis />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={
              startSubtask.isPending || !serverUrl || !accessToken || !password
            }
            onSelect={() => setSubtaskOpen(true)}
          >
            <GitBranch /> Start related subtask
          </DropdownMenuItem>
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
      <Dialog
        open={subtaskOpen}
        onOpenChange={(open) => {
          if (!startSubtask.isPending) setSubtaskOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Start related subtask</DialogTitle>
            <DialogDescription>
              Ask the parent agent to delegate this task and bring the result
              back here. You can open the child chat from its subagent card.
              Both agents use the same workspace files.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleStartSubtask();
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="opencode-subtask-prompt"
                className="text-sm font-medium"
              >
                What should this subtask do?
              </label>
              <Textarea
                id="opencode-subtask-prompt"
                autoFocus
                required
                rows={5}
                placeholder="For example: Investigate why Google sign-in fails and fix the validation."
                value={subtaskPrompt}
                disabled={startSubtask.isPending}
                onChange={(event) => setSubtaskPrompt(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Subagent</span>
                <select
                  className="border-input bg-background h-10 w-full rounded-md border px-3"
                  value={subtaskAgent}
                  disabled={startSubtask.isPending}
                  onChange={(event) => setSubtaskAgent(event.target.value)}
                >
                  <option value="">Let parent choose</option>
                  {availableSubagents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Execution</span>
                <select
                  className="border-input bg-background h-10 w-full rounded-md border px-3"
                  value={subtaskBackground ? "background" : "foreground"}
                  disabled={startSubtask.isPending}
                  onChange={(event) =>
                    setSubtaskBackground(event.target.value === "background")
                  }
                >
                  <option value="foreground">Wait for result</option>
                  <option value="background">Run in background</option>
                </select>
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={startSubtask.isPending}
                onClick={() => setSubtaskOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!subtaskPrompt.trim() || startSubtask.isPending}
              >
                {startSubtask.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <GitBranch />
                )}
                {startSubtask.isPending ? "Starting…" : "Start subtask"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
