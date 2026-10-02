"use client";

import { OpencodeContextUsageMenu } from "@/components/chat/opencode-context-usage-menu";
import { OpencodeMcpMenu } from "@/components/chat/opencode-mcp-menu";
import { OpencodeWorktreeDialog } from "@/components/chat/opencode-worktree-dialog";
import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import { RuntimePulseMenu } from "@/components/runtime-pulse-menu";
import {
  useExportOpencodeSession,
  useForkOpencodeSession,
  useSendOpencodePrompt,
} from "@repo/api-hooks";
import {
  buildOpencodeSubtaskPrompt,
  getOpencodeSessionExportFilename,
  getOpencodeUserMessage,
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
  ArrowUpLeft,
  Download,
  Ellipsis,
  FolderOpen,
  GitBranch,
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
  reviewActive?: boolean;
  worktreeOpen?: boolean;
  onWorktreeOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [ownWorktreeOpen, setOwnWorktreeOpen] = useState(false);
  const isWorktreeOpen = worktreeOpen ?? ownWorktreeOpen;
  const setWorktreeOpen = onWorktreeOpenChange ?? setOwnWorktreeOpen;
  const openChatInDirectory = (nextDirectory: string) => {
    setWorktreeOpen(false);
    const params = new URLSearchParams({ serverUrl, directory: nextDirectory });
    router.push(
      `/projects/${projectId}/sessions/${projectSessionId}?${params.toString()}`,
    );
  };

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
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="bg-background/90 shadow-sm backdrop-blur"
        aria-label="Worktrees"
        title="Worktrees"
        onClick={() => setWorktreeOpen(true)}
      >
        <GitBranch />
      </Button>
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
          inventory={inventory}
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
  const [forkOpen, setForkOpen] = useState(false);
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
            {fork.isPending ||
            exportSession.isPending ||
            startSubtask.isPending ? (
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
