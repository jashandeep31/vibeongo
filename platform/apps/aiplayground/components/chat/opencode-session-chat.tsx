"use client";

import { OpencodeChatQuestion } from "@/components/chat/opencode-chat-question";
import { OpencodeQuestionPrompt } from "@/components/chat/opencode-question-prompt";
import { PromptInput } from "@/components/chat/prompt-input";
import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import { RuntimePulseMenu } from "@/components/runtime-pulse-menu";
import {
  useAbortOpencodeSession,
  useAnswerOpencodeQuestion,
  useOpencodeInventory,
  useRejectOpencodeQuestion,
  useSendOpencodePrompt,
} from "@/hooks/use-opencode-session";
import type {
  OpencodePromptSelection,
  OpencodeSessionData,
  QuestionAnswer,
} from "@/services/opencode-services";
import type { AssistantMessage, ToolPart } from "@opencode-ai/sdk/v2/client";
import { ArrowDown, Braces, MessagesSquare } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type SessionMessages = OpencodeSessionData["messages"];
type ChatError = NonNullable<AssistantMessage["error"]>;

function getPartText(parts: SessionMessages[number]["parts"], type: "text") {
  return parts
    .flatMap((part) => {
      if (type === "text" && part.type === "text") {
        return part.ignored ? [] : [part.text];
      }

      return [];
    })
    .join("\n\n");
}

function createChatTurns(messages: SessionMessages) {
  const turns = messages
    .filter((message) => message.info.role === "user")
    .map((message) => ({
      id: message.info.id,
      question: getPartText(message.parts, "text"),
      images: message.parts.flatMap((part) =>
        part.type === "file" && part.mime.startsWith("image/")
          ? [
              {
                id: part.id,
                url: part.url,
                name: part.filename ?? "Attached image",
              },
            ]
          : [],
      ),
      summaryDiffs:
        typeof message.info.summary === "object" && message.info.summary
          ? message.info.summary.diffs
          : [],
      content: [] as Array<
        | { id: string; type: "text"; text: string }
        | { id: string; type: "tools"; tools: ToolPart[] }
        | { id: string; type: "thinking"; active: boolean }
        | {
            id: string;
            type: "error";
            title: string;
            message: string;
            statusCode?: number;
          }
      >,
      agent: undefined as string | undefined,
      model: undefined as string | undefined,
      durationMs: undefined as number | undefined,
    }));
  const turnsByMessageId = new Map(turns.map((turn) => [turn.id, turn]));

  for (const message of messages) {
    if (message.info.role !== "assistant") continue;

    const turn = turnsByMessageId.get(message.info.parentID);
    if (!turn) continue;

    for (const part of message.parts) {
      if (part.type === "reasoning") {
        if (!part.time?.end) {
          turn.content.push({
            id: part.id,
            type: "thinking",
            active: true,
          });
        }
      }

      if (part.type === "text" && !part.ignored && part.text.trim()) {
        turn.content.push({ id: part.id, type: "text", text: part.text });
      }

      if (part.type === "tool") {
        if (
          part.tool === "question" &&
          (part.state.status === "pending" || part.state.status === "running")
        ) {
          continue;
        }

        const previousContent = turn.content.at(-1);
        if (
          (part.tool === "glob" || part.tool === "read") &&
          previousContent?.type === "tools" &&
          previousContent.tools.every(
            (tool) => tool.tool === "glob" || tool.tool === "read",
          )
        ) {
          previousContent.tools.push(part);
        } else if (
          isEditTool(part) &&
          previousContent?.type === "tools" &&
          previousContent.tools.every((tool) => isEditTool(tool))
        ) {
          previousContent.tools.push(part);
        } else {
          turn.content.push({ id: part.id, type: "tools", tools: [part] });
        }
      }
    }

    if (message.info.error) {
      turn.content.push({
        id: `${message.info.id}-error`,
        type: "error",
        ...getChatError(message.info.error),
      });
    }

    turn.agent = message.info.agent;
    turn.model = message.info.modelID;
    turn.durationMs = message.info.time.completed
      ? message.info.time.completed - message.info.time.created
      : undefined;
  }

  return turns;
}

function isEditTool(tool: ToolPart) {
  return ["edit", "write", "patch", "apply_patch"].includes(tool.tool);
}

function getChatError(error: ChatError) {
  const message =
    "message" in error.data && typeof error.data.message === "string"
      ? error.data.message
      : "OpenCode could not complete this request.";
  const statusCode =
    "statusCode" in error.data && typeof error.data.statusCode === "number"
      ? error.data.statusCode
      : undefined;

  return {
    title: getChatErrorTitle(error.name),
    message,
    statusCode,
  };
}

function getChatErrorTitle(name: ChatError["name"]) {
  switch (name) {
    case "ProviderAuthError":
      return "Provider authentication failed";
    case "ContextOverflowError":
      return "Context limit exceeded";
    case "ContentFilterError":
      return "Response blocked";
    case "MessageOutputLengthError":
      return "Response was too long";
    case "MessageAbortedError":
      return "Request was stopped";
    case "StructuredOutputError":
      return "Invalid structured response";
    default:
      return "OpenCode request failed";
  }
}

export function OpencodeSessionChat({
  projectId,
  chatId,
  sessionId,
  serverUrl,
  accessToken,
  messages,
  rawResponse,
  isStreaming,
}: {
  projectId: string;
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  messages: SessionMessages;
  rawResponse: OpencodeSessionData;
  isStreaming: boolean;
}) {
  const turns = useMemo(() => createChatTurns(messages), [messages]);
  const activeQuestion = rawResponse.questions[0];
  const sendPrompt = useSendOpencodePrompt({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
  });
  const answerQuestion = useAnswerOpencodeQuestion({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
  });
  const abortSession = useAbortOpencodeSession({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
  });
  const rejectQuestion = useRejectOpencodeQuestion({
    chatId,
    sessionId,
    serverUrl,
    accessToken,
  });
  const { data: inventory } = useOpencodeInventory(
    chatId,
    serverUrl,
    accessToken,
  );
  const sessionModelProviderId = rawResponse.session.model?.providerID;
  const sessionModelId = rawResponse.session.model?.id;
  const sessionModelVariant = rawResponse.session.model?.variant;
  const sessionAgent = rawResponse.session.agent;
  const sessionSelection = useMemo(
    () => ({
      model:
        sessionModelProviderId && sessionModelId
          ? `${sessionModelProviderId}/${sessionModelId}`
          : undefined,
      variant: sessionModelVariant,
      agent: sessionAgent,
    }),
    [sessionAgent, sessionModelId, sessionModelProviderId, sessionModelVariant],
  );
  const [selection, setSelection] =
    useState<OpencodePromptSelection>(sessionSelection);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
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

  const updateSelection = (nextSelection: OpencodePromptSelection) =>
    setSelection(nextSelection);

  const updateScrollButtonVisibility = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const distanceFromBottom =
      scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight;
    setShowScrollButton(distanceFromBottom > 50);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
      setShowScrollButton(false);
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [rawResponse.questions.length, scrollToBottom, turns.length]);

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

  return (
    <div className="bg-background text-foreground relative flex h-svh min-h-0 w-full flex-col justify-between">
      <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
        <RuntimePulseMenu projectSessionId={chatId} />
        <ProjectDomainsDialog projectId={projectId} projectSessionId={chatId} />
      </div>
      <div
        ref={scrollAreaRef}
        onScroll={updateScrollButtonVisibility}
        className="grid min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex-1 px-4 pt-16 pb-8 md:px-8">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
            {showRawResponse ? (
              <pre className="w-full text-xs break-words whitespace-pre-wrap">
                {JSON.stringify(rawResponse, null, 2)}
              </pre>
            ) : null}
            {!showRawResponse && turns.length === 0 && !activeQuestion ? (
              <div className="text-muted-foreground flex min-h-[45vh] items-center justify-center text-sm">
                Start the chat by describing what you want to build.
              </div>
            ) : null}
            {!showRawResponse &&
              turns.map((turn, index) => (
                <OpencodeChatQuestion
                  key={turn.id}
                  item={turn}
                  isStreaming={isStreaming && index === turns.length - 1}
                  reserveBottomSpace={
                    index === turns.length - 1 && !activeQuestion
                  }
                />
              ))}
            <div ref={bottomRef} aria-hidden="true" />
          </div>
        </div>
      </div>

      {showScrollButton ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-55 z-50 flex justify-center">
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

      <div className="shrink-0 px-4 pb-4 md:px-0">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setShowRawResponse((visible) => !visible)}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
            >
              {showRawResponse ? (
                <MessagesSquare className="size-3.5" />
              ) : (
                <Braces className="size-3.5" />
              )}
              {showRawResponse ? "Rendered chat" : "Raw response"}
            </button>
          </div>
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
            <PromptInput
              submitDisabled={sendPrompt.isPending || isStreaming}
              isStreaming={isStreaming}
              isStopping={abortSession.isPending}
              onStop={() =>
                abortSession.mutate(undefined, {
                  onError: (error) =>
                    toast.error(error.message || "Could not stop OpenCode"),
                })
              }
              inventory={inventory}
              selection={effectiveSelection}
              onSelectionChange={updateSelection}
              onSubmit={(question, files) =>
                sendPrompt.mutate({
                  text: question,
                  files,
                  selection: effectiveSelection,
                })
              }
              onSubmitSuccess={() => scrollToBottom("smooth")}
              autoFocus
              focusOnTyping
            />
          )}
        </div>
      </div>
    </div>
  );
}
