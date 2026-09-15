"use client";

import { OpencodeChatQuestion } from "@/components/chat/opencode-chat-question";
import { OpencodeQuestionPrompt } from "@/components/chat/opencode-question-prompt";
import { OpencodeComposer } from "@/components/chat/opencode-composer";
import { OpencodeMcpMenu } from "@/components/chat/opencode-mcp-menu";
import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import { RuntimePulseMenu } from "@/components/runtime-pulse-menu";
import {
  useAbortOpencodeSession,
  useAnswerOpencodeQuestion,
  useCancelOpencodeQueuedPrompt,
  useEditOpencodeQueuedPrompt,
  useOpencodeInventory,
  useOpencodeQueuedPrompts,
  useQueueOpencodePrompt,
  useRejectOpencodeQuestion,
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
  type OpencodePromptSelection,
  type OpencodeSessionData,
  type QuestionAnswer,
} from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import {
  ArrowDown,
  ChevronRight,
  Check,
  FolderOpen,
  GripVertical,
  Loader2,
  ListTodo,
  Plus,
  Pencil,
  RefreshCw,
  Send,
  Settings2,
  Terminal,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type SessionMessages = OpencodeSessionData["messages"];

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
  );
  const inventory = inventoryQuery.data;
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
  const turns = useMemo(
    () => createOpencodeChatTurns(visibleMessages, inventory?.models),
    [inventory?.models, visibleMessages],
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
  const { data: queuedPrompts = [] } = useOpencodeQueuedPrompts({
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
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
    sessionId,
    serverUrl,
    accessToken,
    password,
  });
  const reorderQueuedPrompts = useReorderOpencodeQueuedPrompts({
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
  const sessionSelection = useMemo(
    () => getSessionPromptSelection(rawResponse),
    [rawResponse],
  );
  const [selection, setSelection] =
    useState<OpencodePromptSelection>(sessionSelection);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [composerHeight, setComposerHeight] = useState(200);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const latestContentKey = `${turns.at(-1)?.id ?? ""}:${activeQuestion?.id ?? ""}`;
  const previousLatestContentKeyRef = useRef("");
  const effectiveSelection: OpencodePromptSelection = {
    model:
      selection.model ?? sessionSelection.model ?? inventory?.models[0]?.id,
    variant: selection.variant ?? sessionSelection.variant,
    agent:
      selection.agent ??
      sessionSelection.agent ??
      inventory?.agents.find((agent) => agent.mode === "primary")?.id ??
      inventory?.agents[0]?.id,
  };

  useEffect(() => {
    setSelection(sessionSelection);
  }, [sessionId, sessionSelection]);

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

  const dismissQuestion = (requestId: string) => {
    rejectQuestion.mutate(requestId, {
      onError: (error) =>
        toast.error(error.message || "Could not dismiss the question"),
    });
  };

  const sessionUrl = `/projects/${projectId}/sessions/${chatId}`;
  const newChatParams = new URLSearchParams({ serverUrl });
  const composerControls = (
    <>
      <Button
        asChild
        type="button"
        variant="secondary"
        size="sm"
        className="h-10 shrink-0 gap-2 rounded-full px-4 font-normal"
      >
        <Link href={`${sessionUrl}?${newChatParams.toString()}`}>
          <Plus className="size-3.5" />
          New chat
        </Link>
      </Button>
      <Button
        asChild
        type="button"
        variant="secondary"
        size="sm"
        className="h-10 shrink-0 gap-2 rounded-full px-4 font-normal"
      >
        <Link href={`${sessionUrl}/chats/${sessionId}/files`}>
          <FolderOpen className="size-3.5" />
          Files
        </Link>
      </Button>
      <Button
        asChild
        type="button"
        variant="secondary"
        size="sm"
        className="h-10 shrink-0 gap-2 rounded-full px-4 font-normal"
      >
        <Link href={`${sessionUrl}/terminal`}>
          <Terminal className="size-3.5" />
          Terminal
        </Link>
      </Button>
      <Button
        asChild
        type="button"
        variant="secondary"
        size="sm"
        className="h-10 shrink-0 gap-2 rounded-full px-4 font-normal"
      >
        <Link href={`${sessionUrl}/chats/${sessionId}/settings`}>
          <Settings2 className="size-3.5" />
          Settings
        </Link>
      </Button>
    </>
  );

  return (
    <div className="bg-background text-foreground relative flex h-svh min-h-0 w-full flex-col justify-between">
      <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
        <Button
          asChild
          type="button"
          variant="outline"
          size="icon-sm"
          className="bg-background/90 shadow-sm backdrop-blur"
        >
          <Link
            href={`${sessionUrl}/chats/${sessionId}/files`}
            aria-label="Open files"
            title="Open files"
          >
            <FolderOpen />
          </Link>
        </Button>
        <Button
          asChild
          type="button"
          variant="outline"
          size="icon-sm"
          className="bg-background/90 shadow-sm backdrop-blur"
        >
          <Link
            href={`${sessionUrl}/chats/${sessionId}/settings`}
            aria-label="Runtime settings"
            title="Runtime settings"
          >
            <Settings2 />
          </Link>
        </Button>
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
        <OpencodeMcpMenu
          connection={{
            chatId,
            serverUrl,
            accessToken,
            password,
            directory: rawResponse.session.directory,
          }}
        />
        <RuntimePulseMenu projectSessionId={chatId} />
        <ProjectDomainsDialog
          projectId={projectId}
          projectSessionId={chatId}
          iconOnly
        />
      </div>
      <div
        ref={scrollAreaRef}
        onScroll={updateScrollButtonVisibility}
        className="grid min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden"
      >
        <div
          className="flex-1 px-4 pt-16 md:px-8"
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
                  {isLoadingOlder ? <Loader2 className="animate-spin" /> : null}
                  Load earlier messages
                </Button>
              </div>
            ) : null}
            {turns.length === 0 &&
            revertedQuestions.length === 0 &&
            !activeQuestion ? (
              <div className="text-muted-foreground flex min-h-[45vh] items-center justify-center text-sm">
                Start the chat by describing what you want to build.
              </div>
            ) : null}
            {turns.map((turn, index) => (
              <OpencodeChatQuestion
                key={turn.id}
                item={turn}
                isStreaming={isStreaming && index === turns.length - 1}
                isReverting={
                  revertSession.isPending && revertSession.variables === turn.id
                }
                revertDisabled={
                  isStreaming ||
                  revertSession.isPending ||
                  restoreMessage.isPending
                }
                onRevert={() =>
                  revertSession.mutate(turn.id, {
                    onSuccess: () => toast.success("Messages rolled back"),
                    onError: (error) =>
                      toast.error(error.message || "Could not revert messages"),
                  })
                }
                reserveBottomSpace={
                  index === turns.length - 1 && !activeQuestion
                }
              />
            ))}
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
          {revertedQuestions.length > 0 ? (
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
          {activeQuestion ? (
            <OpencodeQuestionPrompt
              key={activeQuestion.id}
              request={activeQuestion}
              isSubmitting={answerQuestion.isPending}
              isDismissing={rejectQuestion.isPending}
              onSubmit={submitQuestionAnswer}
              onDismiss={dismissQuestion}
            />
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
                            const source = displayedQueuedPrompts.findIndex(
                              (entry) => entry.id === draggedQueuedPromptId,
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
                                event.dataTransfer.setDragImage(row, 16, 16);
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
                                        queuedPrompts: displayedQueuedPrompts,
                                        text: editingQueuedPrompt.text,
                                      },
                                      {
                                        onError: (error) =>
                                          toast.error(
                                            error.message ||
                                              "Could not edit queued message",
                                          ),
                                        onSuccess: () =>
                                          setEditingQueuedPrompt(undefined),
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
                        setAreQueuedPromptsExpanded((expanded) => !expanded)
                      }
                    >
                      {areQueuedPromptsExpanded ? "Hide" : "Show"}
                      <ChevronRight
                        className={`size-3.5 transition-transform ${
                          areQueuedPromptsExpanded ? "rotate-90" : "-rotate-90"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ) : null}
              <OpencodeComposer
                submitDisabled={sendPrompt.isPending || queuePrompt.isPending}
                isStreaming={isStreaming}
                queueWhenStreaming
                isStopping={abortSession.isPending}
                onStop={() =>
                  abortSession.mutate(undefined, {
                    onError: (error) =>
                      toast.error(error.message || "Could not stop OpenCode"),
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
                onSubmit={(question, files, fileReferences) => {
                  const input = {
                    text: question,
                    files,
                    fileReferences,
                    selection: effectiveSelection,
                  };
                  if (isStreaming) {
                    queuePrompt.mutate(input, {
                      onError: (error) =>
                        toast.error(error.message || "Could not queue message"),
                    });
                  } else {
                    sendPrompt.mutate(input, {
                      onError: (error) =>
                        toast.error(error.message || "Could not send message"),
                    });
                  }
                }}
                searchFiles={searchFiles}
                onSubmitSuccess={() => scrollToBottom("smooth")}
                autoFocus
                focusOnTyping
                trailingControl={composerControls}
              />
            </>
          )}
        </div>
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
