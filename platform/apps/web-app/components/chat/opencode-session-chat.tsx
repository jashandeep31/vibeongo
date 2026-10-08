"use client";

import {
  composerDraftKey,
  readComposerDraft,
} from "@/lib/opencode-composer-drafts";

import { OpencodeSubagentProvider } from "@/components/chat/opencode-subagent-context";

import {
  OpencodeChatQuestion,
  StreamingIndicator,
} from "@/components/chat/opencode-chat-question";
import { OpencodeQuestionPrompt } from "@/components/chat/opencode-question-prompt";
import { OpencodePermissionDock } from "@/components/chat/opencode-permission-dock";
import { OpencodeWebSearchDock } from "@/components/chat/opencode-web-search-dock";
import {
  OpencodeComposer,
  type OpencodeComposerAction,
} from "@/components/chat/opencode-composer";
import dynamic from "next/dynamic";
import { OpencodeChatTopBar } from "@/components/chat/opencode-chat-top-bar";
import {
  OpencodeContextButton,
  OpencodeContextPanel,
} from "@/components/chat/opencode-context-panel";
import { ProjectSessionFilesPanel } from "@/components/project-session-files-page";
import { ProjectTerminalPanel } from "@/components/project-terminal-panel";
import { WorkspaceResizableLayout, WorkspaceToolRail } from "@/components/workspace-resizable-layout";
import { WorkspaceGitButton, WorkspaceToolIcon } from "@/components/workspace-tool-button";
import {
  useAbortOpencodeSession,
  useForkOpencodeTurn,
  useAnswerOpencodeQuestion,
  useCancelOpencodeQueuedPrompt,
  useEditOpencodeQueuedPrompt,
  useOpencodeCommands,
  useOpencodeInventory,
  useQueueOpencodePrompt,
  useRejectOpencodeQuestion,
  useReloadOpencodeConfig,
  useReplyOpencodePermission,
  useReorderOpencodeQueuedPrompts,
  useRevertOpencodeSession,
  useRestoreRevertedOpencodeMessage,
  useSendOpencodePrompt,
  useSteerOpencodeQueuedPrompt,
} from "@repo/api-hooks";
import {
  createOpencodeChatTurns,
  findOpencodeFiles,
  getRevertedMessageLabel,
  getSessionPromptSelection,
  visibleTimelineMessages,
  type OpencodePromptSelection,
  type OpencodeQueuedPrompt,
  type OpencodeSessionData,
  type QuestionAnswer,
} from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import {
  ArrowDown,
  ChevronRight,
  Check,
  CircleAlert,
  GripVertical,
  Loader2,
  ListTodo,
  Pencil,
  Send,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useWorkspaceTool,
  type WorkspaceTool,
} from "@/hooks/use-workspace-tool";

type SessionMessages = OpencodeSessionData["messages"];

// Load the diff engine only after the user opens Git changes.
const OpencodeReviewPanel = dynamic(
  () =>
    import("@/components/chat/opencode-review-panel").then(
      (module) => module.OpencodeReviewPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div role="status" className="text-muted-foreground p-4 text-sm">
        Loading changes…
      </div>
    ),
  },
);

const ProjectBrowserPanel = dynamic(
  () =>
    import("@/components/project-browser-panel").then(
      (module) => module.ProjectBrowserPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div role="status" className="text-muted-foreground p-4 text-sm">
        Loading browser…
      </div>
    ),
  },
);

const ProjectDomainsPanel = dynamic(
  () => import("@/components/project-domains-panel").then((module) => module.ProjectDomainsPanel),
  { ssr: false },
);
const ProjectSessionSettingsPanel = dynamic(
  () =>
    import("@/components/project-session-settings-panel").then(
      (module) => module.ProjectSessionSettingsPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div role="status" className="text-muted-foreground p-4 text-sm">
        Loading settings…
      </div>
    ),
  },
);

export function OpencodeSessionChat({
  projectId,
  chatId,
  sessionId,
  serverUrl,
  accessToken,
  password,
  messages,
  rawResponse,
  isStreaming,
  isRefreshing,
  hasOlderMessages,
  isLoadingOlder,
  onLoadOlder,
  onRefresh,
}: {
  projectId: string;
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
  messages: SessionMessages;
  rawResponse: OpencodeSessionData;
  isStreaming: boolean;
  isRefreshing: boolean;
  hasOlderMessages: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => Promise<void>;
  onRefresh: () => void;
}) {
  const inventoryQuery = useOpencodeInventory(
    chatId,
    serverUrl,
    accessToken,
    password,
    rawResponse.session.directory,
  );
  const inventory = inventoryQuery.data;
  const { data: commands } = useOpencodeCommands(
    chatId,
    serverUrl,
    accessToken,
    rawResponse.session.directory,
    password,
  );
  const router = useRouter();
  const revertMessageId = rawResponse.session.revert?.messageID;
  const { visibleMessages, revertedMessages } = useMemo(() => {
    if (!revertMessageId) {
      return { visibleMessages: messages, revertedMessages: [] };
    }

    const revertIndex = messages.findIndex(
      (message) => message.info.id === revertMessageId,
    );
    if (revertIndex === -1) {
      return { visibleMessages: messages, revertedMessages: [] };
    }

    return {
      visibleMessages: messages.slice(0, revertIndex),
      revertedMessages: messages.slice(revertIndex),
    };
  }, [messages, revertMessageId]);
  const projectedMessages = useMemo(
    () =>
      visibleTimelineMessages(visibleMessages, rawResponse.pendingInbox ?? []),
    [rawResponse.pendingInbox, visibleMessages],
  );
  const draftKey = composerDraftKey(
    serverUrl,
    chatId,
    rawResponse.session.directory,
    sessionId,
  );
  const sourceIdentity = useRef(draftKey);
  useEffect(() => {
    sourceIdentity.current = draftKey;
    return () => {
      sourceIdentity.current = "";
    };
  }, [draftKey]);
  const fork = useForkOpencodeTurn({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const turns = useMemo(
    () => createOpencodeChatTurns(projectedMessages, inventory?.models, {
      isStreaming,
      pendingInputIds: new Set(rawResponse.pendingInbox.map((item) => item.id)),
    }),
    [inventory?.models, projectedMessages, isStreaming, rawResponse.pendingInbox],
  );
  const hasInlineExecutionError = messages.some(
    (message) => message.info.role === "assistant" && message.info.error,
  );
  const revertedQuestions = useMemo(
    () =>
      revertedMessages
        .filter((message) => message.info.role === "user")
        .map((message) => ({
          id: message.info.id,
          label: getRevertedMessageLabel(message.parts),
        })),
    [revertedMessages],
  );
  const activeQuestion = rawResponse.questions[0];
  const activePermission = rawResponse.permissions[0];
  const activeWebSearchRequest = rawResponse.webSearchRequests[0];
  const sendPrompt = useSendOpencodePrompt({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const queuePrompt = useQueueOpencodePrompt({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const queuedPrompts = useMemo(
    () =>
      (rawResponse.pendingInbox ?? []).filter(
        (item): item is OpencodeQueuedPrompt => item.delivery === "queue",
      ),
    [rawResponse.pendingInbox],
  );
  const [areQueuedPromptsExpanded, setAreQueuedPromptsExpanded] =
    useState(false);
  const [draggedQueuedPromptId, setDraggedQueuedPromptId] = useState<
    string | undefined
  >();
  const [editingQueuedPrompt, setEditingQueuedPrompt] = useState<
    { id: string; text: string } | undefined
  >();
  const cancelQueuedPrompt = useCancelOpencodeQueuedPrompt({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const steerQueuedPrompt = useSteerOpencodeQueuedPrompt({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const editQueuedPrompt = useEditOpencodeQueuedPrompt({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const reorderQueuedPrompts = useReorderOpencodeQueuedPrompts({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const moveQueuedPrompt = (source: number, destination: number) => {
    if (
      source === destination ||
      source < 0 ||
      destination < 0 ||
      source >= displayedQueuedPrompts.length ||
      destination >= displayedQueuedPrompts.length
    )
      return;
    const inboxIds = displayedQueuedPrompts.map((item) => item.id);
    const [moved] = inboxIds.splice(source, 1);
    inboxIds.splice(destination, 0, moved!);
    reorderQueuedPrompts.mutate(
      { inboxIds, queuedPrompts: displayedQueuedPrompts },
      {
        onError: (error) =>
          toast.error(error.message || "Could not reorder queued messages"),
      },
    );
  };
  const displayedQueuedPrompts = reorderQueuedPrompts.isPending
    ? reorderQueuedPrompts.variables.inboxIds.flatMap((id) =>
        reorderQueuedPrompts.variables.queuedPrompts.filter(
          (item) => item.id === id,
        ),
      )
    : queuedPrompts;
  const answerQuestion = useAnswerOpencodeQuestion({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const abortSession = useAbortOpencodeSession({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const rejectQuestion = useRejectOpencodeQuestion({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const replyPermission = useReplyOpencodePermission({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const revertSession = useRevertOpencodeSession({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const restoreMessage = useRestoreRevertedOpencodeMessage({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const reloadConfig = useReloadOpencodeConfig({
    chatId,
    serverUrl,
    accessToken,
    password,
    directory: rawResponse.session.directory,
  });
  const { active, opened, openPanel, closePanel, togglePanel, forgetPanel } =
    useWorkspaceTool();
  const isContextOpen = active === "context";
  const isFilesOpen = active === "files";
  const isSettingsOpen = active === "settings";
  const isDomainsOpen = active === "domains";
  const isBrowserOpen = active === "browser";
  const isGitOpen = active === "git";
  const isTerminalOpen = active === "terminal";
  const hasOpenedContext = opened.context;
  const hasOpenedFiles = opened.files;
  const hasOpenedSettings = opened.settings;
  const hasOpenedDomains = opened.domains;
  const hasOpenedBrowser = opened.browser;
  const hasOpenedGit = opened.git;
  const hasOpenedTerminal = opened.terminal;
  const contextButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const domainsButtonRef = useRef<HTMLButtonElement>(null);
  const browserButtonRef = useRef<HTMLButtonElement>(null);
  const gitButtonRef = useRef<HTMLButtonElement>(null);
  const filesButtonRef = useRef<HTMLButtonElement>(null);
  const terminalButtonRef = useRef<HTMLButtonElement>(null);
  const previousWorkspaceTool = useRef<WorkspaceTool | null>(null);
  const [isWorktreeOpen, setIsWorktreeOpen] = useState(false);
  const [hasUnsavedFileChanges, setHasUnsavedFileChanges] = useState(false);
  const revertSessionMutate = revertSession.mutate;
  const restoreMessageMutate = restoreMessage.mutate;
  const reloadConfigMutate = reloadConfig.mutate;
  const lastQuestionId = [...visibleMessages]
    .reverse()
    .find((message) => message.info.role === "user")?.info.id;
  const firstRevertedId = revertedQuestions[0]?.id;
  const secondRevertedId = revertedQuestions[1]?.id;
  const composerActions = useMemo<OpencodeComposerAction[]>(
    () => [
      {
        name: "undo",
        description: "Revert the last message",
        run: () => {
          if (isStreaming) {
            toast.error("Wait for the response to finish before undoing");
            return;
          }
          if (!lastQuestionId) {
            toast.error("There is no message to undo");
            return;
          }
          revertSessionMutate(lastQuestionId, {
            onSuccess: () => toast.success("Messages rolled back"),
            onError: (error) =>
              toast.error(error.message || "Could not revert messages"),
          });
        },
      },
      {
        name: "redo",
        description: "Restore the last reverted message",
        run: () => {
          if (!firstRevertedId) {
            toast.error("There is no message to redo");
            return;
          }
          restoreMessageMutate(
            { messageId: firstRevertedId, nextMessageId: secondRevertedId },
            {
              onSuccess: () => toast.success("Message restored"),
              onError: (error) =>
                toast.error(error.message || "Could not restore message"),
            },
          );
        },
      },
      {
        name: "reload",
        description: "Reload OpenCode config",
        run: () =>
          reloadConfigMutate(undefined, {
            onSuccess: () => toast.success("OpenCode config reloaded"),
            onError: (error) =>
              toast.error(error.message || "Could not reload config"),
          }),
      },
      {
        name: "worktree",
        description: "Manage worktrees",
        run: () => setIsWorktreeOpen(true),
      },
    ],
    [
      firstRevertedId,
      isStreaming,
      lastQuestionId,
      reloadConfigMutate,
      restoreMessageMutate,
      revertSessionMutate,
      secondRevertedId,
    ],
  );
  const sessionSelection = useMemo(
    () => getSessionPromptSelection(rawResponse),
    [rawResponse],
  );
  const [selection, setSelection] = useState<OpencodePromptSelection>(
    () => readComposerDraft(draftKey)?.selection ?? sessionSelection,
  );
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [composerHeight, setComposerHeight] = useState(200);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const latestContentKey = `${turns.at(-1)?.id ?? ""}:${turns.at(-1)?.content.length ?? 0}:${activeQuestion?.id ?? ""}`;
  const previousLatestContentKeyRef = useRef("");
  const effectiveSelection: OpencodePromptSelection = {
    model:
      selection.model ?? sessionSelection.model ?? inventory?.models[0]?.id,
    variant: selection.variant ?? sessionSelection.variant,
    agent:
      selection.agent ??
      sessionSelection.agent ??
      inventory?.defaultSelection.agent ??
      inventory?.agents.find((agent) => agent.mode === "primary")?.id ??
      inventory?.agents[0]?.id,
  };

  const selectionIdentity = useRef(draftKey);
  const followedAgent = useRef(sessionSelection.agent);
  useEffect(() => {
    if (selectionIdentity.current !== draftKey) {
      selectionIdentity.current = draftKey;
      setSelection(readComposerDraft(draftKey)?.selection ?? sessionSelection);
    } else if (followedAgent.current !== sessionSelection.agent) {
      setSelection((current) => ({ ...current, agent: sessionSelection.agent }));
    }
    followedAgent.current = sessionSelection.agent;
  }, [draftKey, sessionSelection]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;

    const updateComposerHeight = () => setComposerHeight(composer.offsetHeight);
    updateComposerHeight();

    const observer = new ResizeObserver(updateComposerHeight);
    observer.observe(composer);
    return () => observer.disconnect();
  }, []);

  const updateSelection = (nextSelection: OpencodePromptSelection) =>
    setSelection(nextSelection);
  const searchFiles = useCallback(
    (query: string) =>
      findOpencodeFiles(
        chatId,
        serverUrl,
        accessToken,
        query,
        rawResponse.session.directory,
        password,
      ),
    [accessToken, chatId, password, rawResponse.session.directory, serverUrl],
  );

  const updateScrollButtonVisibility = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const distanceFromBottom =
      scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight;
    setShowScrollButton(distanceFromBottom > 50);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    requestAnimationFrame(() => {
      const scrollArea = scrollAreaRef.current;
      scrollArea?.scrollTo({ top: scrollArea.scrollHeight, behavior });
      setShowScrollButton(false);
    });
  }, []);

  const loadEarlierMessages = useCallback(async () => {
    const scrollArea = scrollAreaRef.current;
    const previousHeight = scrollArea?.scrollHeight ?? 0;
    const previousTop = scrollArea?.scrollTop ?? 0;
    try {
      await onLoadOlder();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!scrollArea) return;
          scrollArea.scrollTop =
            previousTop + scrollArea.scrollHeight - previousHeight;
        }),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load earlier messages",
      );
    }
  }, [onLoadOlder]);

  useEffect(() => {
    if (previousLatestContentKeyRef.current !== latestContentKey) {
      previousLatestContentKeyRef.current = latestContentKey;
      scrollToBottom();
    }
  }, [latestContentKey, scrollToBottom]);

  const submitQuestionAnswer = (
    requestId: string,
    answers: QuestionAnswer[],
  ) => {
    answerQuestion.mutate(
      { requestId, answers },
      {
        onError: (error) =>
          toast.error(error.message || "Could not submit your answer"),
        onSuccess: () => scrollToBottom("smooth"),
      },
    );
  };

  const dismissQuestion = (requestId: string, message?: string) => {
    rejectQuestion.mutate(
      { requestId, message },
      {
        onError: (error) =>
          toast.error(error.message || "Could not dismiss the question"),
      },
    );
  };

  const sessionUrl = `/projects/${projectId}/sessions/${chatId}`;
  const chatUrl = `${sessionUrl}/chats/${sessionId}`;
  const closeContextPanel = closePanel;
  const closeFilesPanel = closePanel;
  const closeSettingsPanel = closePanel;
  const closeBrowserPanel = closePanel;
  const closeGitPanel = closePanel;
  const closeTerminalPanel = closePanel;
  const closeDomainsPanel = closePanel;
  const toggleContextPanel = useCallback(
    () => togglePanel("context"),
    [togglePanel],
  );
  const toggleSettingsPanel = useCallback(
    () => togglePanel("settings"),
    [togglePanel],
  );
  const toggleBrowserPanel = useCallback(
    () => togglePanel("browser"),
    [togglePanel],
  );
  const toggleGitPanel = useCallback(() => togglePanel("git"), [togglePanel]);
  const toggleDomainsPanel = useCallback(
    () => togglePanel("domains"),
    [togglePanel],
  );
  const openFilesPanel = useCallback(() => openPanel("files"), [openPanel]);
  const openTerminalPanel = useCallback(() => openPanel("terminal"), [openPanel]);
  const openDomainsPanel = useCallback(() => openPanel("domains"), [openPanel]);
  useEffect(() => {
    const previous = previousWorkspaceTool.current;
    previousWorkspaceTool.current = active;
    if (!active && previous) {
      const buttons = {
        context: contextButtonRef,
        files: filesButtonRef,
        settings: settingsButtonRef,
        domains: domainsButtonRef,
        browser: browserButtonRef,
        git: gitButtonRef,
        terminal: terminalButtonRef,
      };
      buttons[previous].current?.focus({ preventScroll: true });
    }
  }, [active]);
  const parentSessionId = rawResponse.session.parentID;
  const isSubagentSession = Boolean(
    parentSessionId && !rawResponse.session.fork,
  );
  const newChatParams = new URLSearchParams({ serverUrl });
  const workspaceSidebar = (
    <>
      {hasOpenedContext && (
        <div
          className={isContextOpen ? "h-full" : "hidden"}
          aria-hidden={!isContextOpen}
        >
          <OpencodeContextPanel
            session={rawResponse}
            inventory={inventory}
            connection={{ chatId, sessionId, serverUrl, accessToken, password }}
            isActive={isContextOpen}
            hasOlderMessages={hasOlderMessages}
            isLoadingOlder={isLoadingOlder}
            onLoadOlder={onLoadOlder}
            onClose={closeContextPanel}
          />
        </div>
      )}
      {hasOpenedFiles ? (
        <div
          className={isFilesOpen ? "h-full" : "hidden"}
          aria-hidden={!isFilesOpen}
        >
          <ProjectSessionFilesPanel
            isActive={isFilesOpen}
            projectId={projectId}
            projectSessionId={chatId}
            sessionId={sessionId}
            onClose={closeFilesPanel}
            onDirtyChange={setHasUnsavedFileChanges}
          />
        </div>
      ) : null}
      {hasOpenedSettings ? (
        <div
          className={isSettingsOpen ? "h-full" : "hidden"}
          aria-hidden={!isSettingsOpen}
        >
          <ProjectSessionSettingsPanel
            projectId={projectId}
            projectSessionId={chatId}
            sessionId={sessionId}
            isActive={isSettingsOpen}
            onClose={closeSettingsPanel}
            onOpenFiles={openFilesPanel}
            onOpenTerminal={openTerminalPanel}
            onOpenDomains={openDomainsPanel}
          />
        </div>
      ) : null}
      {hasOpenedDomains ? (
        <div className={isDomainsOpen ? "h-full" : "hidden"} aria-hidden={!isDomainsOpen}>
          <ProjectDomainsPanel projectId={projectId} projectSessionId={chatId} isActive={isDomainsOpen} onClose={closeDomainsPanel} />
        </div>
      ) : null}
      {hasOpenedBrowser ? (
        <div
          className={isBrowserOpen ? "h-full" : "hidden"}
          aria-hidden={!isBrowserOpen}
        >
          <ProjectBrowserPanel
            projectId={projectId}
            projectSessionId={chatId}
            sessionId={sessionId}
            isActive={isBrowserOpen}
            onOpenDomains={openDomainsPanel}
            onClose={closeBrowserPanel}
          />
        </div>
      ) : null}
      {hasOpenedGit ? (
        <div
          className={isGitOpen ? "h-full" : "hidden"}
          aria-hidden={!isGitOpen}
        >
          <OpencodeReviewPanel
            gitConnection={{ chatId, directory: rawResponse.session.directory, serverUrl, accessToken, password }}
            isActive={isGitOpen}
            changes={rawResponse.changes}
            chatUrl={chatUrl}
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
            onClose={closeGitPanel}
          />
        </div>
      ) : null}
      {hasOpenedTerminal ? (
        <div
          className={isTerminalOpen ? "h-full" : "hidden"}
          aria-hidden={!isTerminalOpen}
        >
          <ProjectTerminalPanel
            projectId={projectId}
            projectSessionId={chatId}
            isActive={isTerminalOpen}
            onClose={closeTerminalPanel}
          />
        </div>
      ) : null}
    </>
  );
  const forkBlockedReason = isStreaming
    ? "Wait for the response to finish before forking."
    : revertSession.isPending || restoreMessage.isPending
      ? "Wait for the history update to finish before forking."
      : undefined;
  const forkTurn = (messageId: string) => {
    if (
      fork.isPending ||
      forkBlockedReason ||
      !turns.some(
        (turn) => turn.id === messageId && turn.answerCompletedAt !== undefined,
      )
    )
      return;
    const expectedIdentity = draftKey;
    fork.mutate(messageId, {
      onSuccess: ({ session }) => {
        if (sourceIdentity.current !== expectedIdentity) return;
        const params = new URLSearchParams({
          serverUrl,
          directory: session.directory,
        });
        router.push(`${sessionUrl}/chats/${session.id}?${params.toString()}`);
      },
      onError: (error) => {
        if (sourceIdentity.current === expectedIdentity)
          toast.error(error.message || "Could not fork this answer");
      },
    });
  };

  return (
    <div className="bg-background text-foreground relative flex h-svh min-h-0 w-full flex-col overflow-hidden">
      <OpencodeChatTopBar
        projectId={projectId}
        projectSessionId={chatId}
        chatUrl={chatUrl}
        serverUrl={serverUrl}
        accessToken={accessToken}
        password={password}
        directory={rawResponse.session.directory}
        session={rawResponse}
        showSettings={false}
        showDomains={false}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
        worktreeOpen={isWorktreeOpen}
        onWorktreeOpenChange={setIsWorktreeOpen}
      />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <WorkspaceResizableLayout
          sidebar={workspaceSidebar}
          isOpen={
            isContextOpen ||
            isFilesOpen ||
            isTerminalOpen ||
            isGitOpen ||
            isBrowserOpen ||
            isDomainsOpen ||
            isSettingsOpen
          }
        >
          <section className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col justify-between">
            <div
              ref={scrollAreaRef}
              onScroll={updateScrollButtonVisibility}
              className="grid min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden"
            >
              <div
                className="flex-1 px-4 pt-8 md:px-8"
                style={{ paddingBottom: composerHeight + 32 }}
              >
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
                  {hasOlderMessages ? (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isLoadingOlder}
                        onClick={() => void loadEarlierMessages()}
                      >
                        {isLoadingOlder ? (
                          <Loader2 className="animate-spin" />
                        ) : null}
                        Load earlier messages
                      </Button>
                    </div>
                  ) : null}
                  {rawResponse.executionError && !hasInlineExecutionError ? (
                    <Alert
                      variant="destructive"
                      role="alert"
                      aria-live="assertive"
                    >
                      <CircleAlert />
                      <AlertTitle>
                        {rawResponse.executionError.title}
                        {rawResponse.executionError.statusCode
                          ? ` (${rawResponse.executionError.statusCode})`
                          : ""}
                      </AlertTitle>
                      <AlertDescription className="break-words whitespace-pre-wrap">
                        {rawResponse.executionError.message}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {turns.length === 0 &&
                  revertedQuestions.length === 0 &&
                  !activeQuestion &&
                  !activePermission &&
                  !activeWebSearchRequest ? (
                    <div className="text-muted-foreground flex min-h-[45vh] items-center justify-center text-sm">
                      Start the chat by describing what you want to build.
                    </div>
                  ) : null}
                  <OpencodeSubagentProvider
                    connection={{
                      chatId,
                      chatUrl: `${sessionUrl}/chats/${sessionId}`,
                      serverUrl,
                      accessToken,
                      password,
                    }}
                  >
                    {turns.map((turn, index) => (
                      <OpencodeChatQuestion
                        key={turn.id}
                        item={turn}
                        onFork={
                          turn.answerCompletedAt !== undefined
                            ? () => forkTurn(turn.id)
                            : undefined
                        }
                        forkDisabled={
                          fork.isPending || Boolean(forkBlockedReason)
                        }
                        isForking={fork.isPending && fork.variables === turn.id}
                        isStreaming={turn.isStreaming}
                        isReverting={
                          revertSession.isPending &&
                          revertSession.variables === turn.id
                        }
                        revertDisabled={
                          isStreaming ||
                          revertSession.isPending ||
                          restoreMessage.isPending
                        }
                        onRevert={() =>
                          revertSession.mutate(turn.id, {
                            onSuccess: () =>
                              toast.success("Messages rolled back"),
                            onError: (error) =>
                              toast.error(
                                error.message || "Could not revert messages",
                              ),
                          })
                        }
                        reserveBottomSpace={
                          index === turns.length - 1 && !activeQuestion
                        }
                      />
                    ))}
                  </OpencodeSubagentProvider>
                  {isStreaming && turns.length === 0 ? (
                    <StreamingIndicator />
                  ) : null}
                </div>
              </div>
            </div>

            {showScrollButton ? (
              <div
                className="pointer-events-none absolute inset-x-0 z-50 flex justify-center"
                style={{ bottom: composerHeight + 16 }}
              >
                <button
                  type="button"
                  onClick={() => scrollToBottom("smooth")}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-colors"
                  aria-label="Scroll to latest message"
                >
                  <ArrowDown className="h-5 w-5" />
                </button>
              </div>
            ) : null}

            <div
              ref={composerRef}
              className="absolute inset-x-0 bottom-0 z-40 px-4 py-3 md:px-0"
            >
              <div
                aria-hidden="true"
                className="from-background/95 via-background/70 pointer-events-none absolute inset-x-0 -top-10 bottom-0 bg-gradient-to-t to-transparent [mask-image:linear-gradient(to_top,black_0%,black_70%,transparent_100%)] backdrop-blur-xl"
              />
              <div className="relative mx-auto w-full max-w-4xl">
                {!isSubagentSession && revertedQuestions.length > 0 ? (
                  <div className="mb-2">
                    <RevertedMessagesPanel
                      messages={revertedQuestions}
                      restoringMessageId={restoreMessage.variables?.messageId}
                      restoreDisabled={isStreaming || revertSession.isPending}
                      onRestore={(messageId, nextMessageId) =>
                        restoreMessage.mutate(
                          { messageId, nextMessageId },
                          {
                            onSuccess: () => toast.success("Message restored"),
                            onError: (error) =>
                              toast.error(
                                error.message || "Could not restore message",
                              ),
                          },
                        )
                      }
                    />
                  </div>
                ) : null}
                {activePermission ? (
                  <OpencodePermissionDock
                    request={activePermission}
                    isResponding={replyPermission.isPending}
                    onDecide={(decision) =>
                      replyPermission.mutate(
                        { requestId: activePermission.id, decision },
                        {
                          onError: (error) =>
                            toast.error(
                              error.message ||
                                "Could not answer permission request",
                            ),
                        },
                      )
                    }
                  />
                ) : activeWebSearchRequest ? (
                  <OpencodeWebSearchDock
                    request={activeWebSearchRequest}
                    chatId={chatId}
                    directory={rawResponse.session.directory}
                    serverUrl={serverUrl}
                    accessToken={accessToken}
                    password={password}
                  />
                ) : activeQuestion ? (
                  <OpencodeQuestionPrompt
                    key={activeQuestion.id}
                    request={activeQuestion}
                    isSubmitting={answerQuestion.isPending}
                    isDismissing={rejectQuestion.isPending}
                    isStreaming={isStreaming}
                    onSubmit={submitQuestionAnswer}
                    onDismiss={dismissQuestion}
                  />
                ) : isSubagentSession && parentSessionId ? (
                  <div className="border-border bg-background text-muted-foreground rounded-xl border p-3 text-sm">
                    Subagent sessions cannot be prompted.{" "}
                    <Link
                      href={`${sessionUrl}/chats/${encodeURIComponent(parentSessionId)}?${newChatParams.toString()}`}
                      className="text-foreground hover:text-primary rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      Back to main session
                    </Link>
                  </div>
                ) : (
                  <>
                    {queuedPrompts.length ? (
                      <div className="bg-card mb-2 rounded-2xl border px-4 py-3 shadow-sm">
                        {areQueuedPromptsExpanded ? (
                          <div
                            id="queued-prompts"
                            className="mb-2 flex flex-col gap-1.5"
                          >
                            {displayedQueuedPrompts.map((item, index) => (
                              <div
                                key={item.id}
                                data-queue-prompt-row
                                className="flex min-w-0 items-center gap-2 rounded-md text-sm"
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={() => {
                                  const source =
                                    displayedQueuedPrompts.findIndex(
                                      (entry) =>
                                        entry.id === draggedQueuedPromptId,
                                    );
                                  moveQueuedPrompt(source, index);
                                  setDraggedQueuedPromptId(undefined);
                                }}
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  draggable={!reorderQueuedPrompts.isPending}
                                  aria-label="Drag to reorder queued message"
                                  disabled={reorderQueuedPrompts.isPending}
                                  onDragStart={(event) => {
                                    event.dataTransfer.effectAllowed = "move";
                                    const row = event.currentTarget.closest(
                                      "[data-queue-prompt-row]",
                                    );
                                    if (row instanceof HTMLElement) {
                                      event.dataTransfer.setDragImage(
                                        row,
                                        16,
                                        16,
                                      );
                                    }
                                    setDraggedQueuedPromptId(item.id);
                                  }}
                                  onDragEnd={() =>
                                    setDraggedQueuedPromptId(undefined)
                                  }
                                >
                                  <GripVertical />
                                </Button>
                                {editingQueuedPrompt?.id === item.id ? (
                                  <input
                                    className="border-input min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1 text-sm"
                                    value={editingQueuedPrompt.text}
                                    onChange={(event) =>
                                      setEditingQueuedPrompt({
                                        id: item.id,
                                        text: event.target.value,
                                      })
                                    }
                                    autoFocus
                                  />
                                ) : (
                                  <span className="min-w-0 flex-1 truncate">
                                    {item.prompt.text || "Attachment"}
                                  </span>
                                )}
                                <div className="flex shrink-0 items-center gap-1">
                                  {editingQueuedPrompt?.id === item.id ? (
                                    <>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label="Save queued message"
                                        disabled={editQueuedPrompt.isPending}
                                        onClick={() =>
                                          editQueuedPrompt.mutate(
                                            {
                                              inboxId: item.id,
                                              queuedPrompts:
                                                displayedQueuedPrompts,
                                              text: editingQueuedPrompt.text,
                                            },
                                            {
                                              onError: (error) =>
                                                toast.error(
                                                  error.message ||
                                                    "Could not edit queued message",
                                                ),
                                              onSuccess: () =>
                                                setEditingQueuedPrompt(
                                                  undefined,
                                                ),
                                            },
                                          )
                                        }
                                      >
                                        <Check />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label="Cancel editing queued message"
                                        onClick={() =>
                                          setEditingQueuedPrompt(undefined)
                                        }
                                      >
                                        <X />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-xs"
                                      aria-label="Edit queued message"
                                      disabled={
                                        cancelQueuedPrompt.isPending ||
                                        steerQueuedPrompt.isPending ||
                                        reorderQueuedPrompts.isPending
                                      }
                                      onClick={() =>
                                        setEditingQueuedPrompt({
                                          id: item.id,
                                          text: item.prompt.text,
                                        })
                                      }
                                    >
                                      <Pencil />
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={
                                      isStreaming
                                        ? "Steer queued message"
                                        : "Send queued message"
                                    }
                                    disabled={
                                      cancelQueuedPrompt.isPending ||
                                      steerQueuedPrompt.isPending ||
                                      reorderQueuedPrompts.isPending
                                    }
                                    onClick={() =>
                                      steerQueuedPrompt.mutate(item.id, {
                                        onError: (error) =>
                                          toast.error(
                                            error.message ||
                                              "Could not steer queued message",
                                          ),
                                      })
                                    }
                                  >
                                    <Send />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label="Remove queued message"
                                    disabled={
                                      cancelQueuedPrompt.isPending ||
                                      steerQueuedPrompt.isPending ||
                                      reorderQueuedPrompts.isPending
                                    }
                                    onClick={() =>
                                      cancelQueuedPrompt.mutate(item.id, {
                                        onError: (error) =>
                                          toast.error(
                                            error.message ||
                                              "Could not remove queued message",
                                          ),
                                      })
                                    }
                                  >
                                    <Trash2 />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                          <ListTodo className="size-4" />
                          Queued messages ({queuedPrompts.length})
                          <button
                            type="button"
                            className="hover:text-foreground ml-auto flex items-center gap-1 rounded-sm px-1 py-0.5 transition-colors"
                            aria-expanded={areQueuedPromptsExpanded}
                            aria-controls="queued-prompts"
                            onClick={() =>
                              setAreQueuedPromptsExpanded(
                                (expanded) => !expanded,
                              )
                            }
                          >
                            {areQueuedPromptsExpanded ? "Hide" : "Show"}
                            <ChevronRight
                              className={`size-3.5 transition-transform ${
                                areQueuedPromptsExpanded
                                  ? "rotate-90"
                                  : "-rotate-90"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <OpencodeComposer
                      key={draftKey}
                      draftKey={draftKey}
                      submitDisabled={
                        sendPrompt.isPending || queuePrompt.isPending
                      }
                      isStreaming={isStreaming}
                      queueWhenStreaming
                      isStopping={abortSession.isPending}
                      onStop={() =>
                        abortSession.mutate(undefined, {
                          onError: (error) =>
                            toast.error(
                              error.message || "Could not stop OpenCode",
                            ),
                        })
                      }
                      inventory={inventory}
                      providerConnection={{
                        accessToken,
                        chatId,
                        directory: rawResponse.session.directory,
                        onConnected: async () => {
                          await inventoryQuery.refetch();
                        },
                        password,
                        serverUrl,
                      }}
                      selection={effectiveSelection}
                      onSelectionChange={updateSelection}
                      onSubmit={async (
                        question,
                        files,
                        fileReferences,
                        forkDraft,
                      ) => {
                        const input = {
                          text: question,
                          files,
                          fileReferences,
                          forkDraft,
                          selection: effectiveSelection,
                        };
                        try {
                          if (isStreaming) await queuePrompt.mutateAsync(input);
                          else await sendPrompt.mutateAsync(input);
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Could not send message",
                          );
                          throw error;
                        }
                      }}
                      searchFiles={searchFiles}
                      commands={commands}
                      actions={composerActions}
                      onNewChat={() =>
                        router.push(`${sessionUrl}?${newChatParams.toString()}`)
                      }
                      onSubmitSuccess={() => scrollToBottom("smooth")}
                      autoFocus
                      focusOnTyping
                    />
                  </>
                )}
              </div>
            </div>
          </section>
        </WorkspaceResizableLayout>
        <WorkspaceToolRail>
          <OpencodeContextButton
            session={rawResponse}
            inventory={inventory}
            isOpen={isContextOpen}
            onClick={toggleContextPanel}
            buttonRef={contextButtonRef}
          />
          <Button
            ref={filesButtonRef}
            type="button"
            variant={isFilesOpen ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={isFilesOpen ? "Close files panel" : "Open files panel"}
            aria-pressed={isFilesOpen}
            title="Files"
            onClick={() => {
              if (isFilesOpen) {
                if (hasUnsavedFileChanges) {
                  if (!window.confirm("Discard your unsaved file changes?"))
                    return;
                  forgetPanel("files");
                  setHasUnsavedFileChanges(false);
                }
                closeFilesPanel();
                return;
              }
              openFilesPanel();
            }}
          >
            <WorkspaceToolIcon tool="files" />
          </Button>
          <WorkspaceGitButton
            buttonRef={gitButtonRef}
            connection={{ chatId, directory: rawResponse.session.directory, serverUrl, accessToken, password }}
            isOpen={isGitOpen}
            onClick={toggleGitPanel}
          />
          <Button
            ref={terminalButtonRef}
            type="button"
            variant={isTerminalOpen ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={
              isTerminalOpen ? "Close terminals panel" : "Open terminals panel"
            }
            aria-pressed={isTerminalOpen}
            title="Terminals"
            onClick={() => {
              if (isTerminalOpen) closeTerminalPanel();
              else openTerminalPanel();
            }}
          >
            <WorkspaceToolIcon tool="terminal" />
          </Button>
          <Button
            ref={domainsButtonRef}
            type="button"
            variant={isDomainsOpen ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={isDomainsOpen ? "Close domains panel" : "Open domains panel"}
            aria-pressed={isDomainsOpen}
            title="Domains"
            onClick={toggleDomainsPanel}
          >
            <WorkspaceToolIcon tool="domains" />
          </Button>
          <Button
            ref={browserButtonRef}
            type="button"
            variant={isBrowserOpen ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={
              isBrowserOpen ? "Close browser panel" : "Open browser panel"
            }
            aria-pressed={isBrowserOpen}
            title="Browser"
            onClick={toggleBrowserPanel}
          >
            <WorkspaceToolIcon tool="browser" />
          </Button>
          <Button
            ref={settingsButtonRef}
            className="group"
            type="button"
            variant={isSettingsOpen ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={
              isSettingsOpen ? "Close settings panel" : "Open settings panel"
            }
            aria-pressed={isSettingsOpen}
            title="Runtime settings"
            onClick={toggleSettingsPanel}
          >
            <WorkspaceToolIcon tool="settings" />
          </Button>
        </WorkspaceToolRail>
      </div>
    </div>
  );
}

function RevertedMessagesPanel({
  messages,
  restoringMessageId,
  restoreDisabled,
  onRestore,
}: {
  messages: Array<{ id: string; label: string }>;
  restoringMessageId?: string;
  restoreDisabled: boolean;
  onRestore: (messageId: string, nextMessageId?: string) => void;
}) {
  return (
    <details
      open
      className="group/reverted border-border bg-muted/20 overflow-hidden rounded-xl border"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <Undo2 className="text-muted-foreground size-4" />
        <span>
          {messages.length} rolled back{" "}
          {messages.length === 1 ? "message" : "messages"}
        </span>
        <ChevronRight className="text-muted-foreground ml-auto size-3.5 transition-transform group-open/reverted:rotate-90" />
      </summary>
      <div className="border-border max-h-52 overflow-y-auto border-t px-4 py-3">
        <div className="space-y-2">
          {messages.map((message, index) => (
            <div key={message.id} className="flex min-w-0 items-center gap-3">
              <p
                className="text-muted-foreground min-w-0 flex-1 truncate text-sm"
                title={message.label}
              >
                {message.label}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={restoreDisabled || restoringMessageId !== undefined}
                onClick={() => onRestore(message.id, messages[index + 1]?.id)}
              >
                {restoringMessageId === message.id ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                Restore message
              </Button>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
