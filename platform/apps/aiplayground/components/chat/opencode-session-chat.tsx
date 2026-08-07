"use client";

import { OpencodeChatQuestion } from "@/components/chat/opencode-chat-question";
import { PromptInput } from "@/components/chat/prompt-input";
import { ProjectDomainsDialog } from "@/components/dialogs/project-domains-dialog";
import {
  useOpencodeInventory,
  useSendOpencodePrompt,
} from "@/hooks/use-opencode-session";
import type {
  OpencodePromptSelection,
  OpencodeSessionData,
} from "@/services/opencode-services";
import type { AssistantMessage, ToolPart } from "@opencode-ai/sdk/v2/client";
import { ArrowDown, Braces, MessagesSquare } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
        const previousContent = turn.content.at(-1);
        if (
          part.tool === "glob" &&
          previousContent?.type === "tools" &&
          previousContent.tools.every((tool) => tool.tool === "glob")
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
  messages,
  rawResponse,
  isStreaming,
}: {
  projectId: string;
  chatId: string;
  sessionId: string;
  serverUrl: string;
  messages: SessionMessages;
  rawResponse: OpencodeSessionData;
  isStreaming: boolean;
}) {
  const turns = useMemo(() => createChatTurns(messages), [messages]);
  const sendPrompt = useSendOpencodePrompt({ chatId, sessionId, serverUrl });
  const { data: inventory } = useOpencodeInventory(chatId, serverUrl);
  const [selection, setSelection] = useState<OpencodePromptSelection>(() => {
    const sessionSelection = getSessionSelection(rawResponse);
    if (typeof window === "undefined") return sessionSelection;

    try {
      const savedSelection = window.localStorage.getItem(
        `opencode-selection:${chatId}`,
      );
      return savedSelection
        ? (JSON.parse(savedSelection) as OpencodePromptSelection)
        : sessionSelection;
    } catch {
      return sessionSelection;
    }
  });
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const effectiveSelection: OpencodePromptSelection = {
    model:
      selection.model ??
      getSessionSelection(rawResponse).model ??
      inventory?.models[0]?.id,
    variant: selection.variant ?? getSessionSelection(rawResponse).variant,
    agent:
      selection.agent ??
      getSessionSelection(rawResponse).agent ??
      inventory?.agents.find((agent) => agent.mode === "primary")?.id ??
      inventory?.agents[0]?.id,
  };

  const updateSelection = (nextSelection: OpencodePromptSelection) => {
    setSelection(nextSelection);
    window.localStorage.setItem(
      `opencode-selection:${chatId}`,
      JSON.stringify(nextSelection),
    );
  };

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
  }, [scrollToBottom, turns.length]);

  return (
    <div className="bg-background text-foreground relative flex h-svh min-h-0 w-full flex-col justify-between">
      <div className="absolute top-3 right-3 z-50">
        <ProjectDomainsDialog projectId={projectId} />
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
            {!showRawResponse && turns.length === 0 ? (
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
                  reserveBottomSpace={index === turns.length - 1}
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
          <PromptInput
            disabled={sendPrompt.isPending || isStreaming}
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
          />
        </div>
      </div>
    </div>
  );
}

function getSessionSelection(
  rawResponse: OpencodeSessionData,
): OpencodePromptSelection {
  const model = rawResponse.session.model;

  return {
    model: model ? `${model.providerID}/${model.id}` : undefined,
    variant: model?.variant,
    agent: rawResponse.session.agent,
  };
}
