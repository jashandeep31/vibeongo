"use client";

import MarkdownRenderer from "@/components/markdown-renderer";
import {
  WorkComposer,
  type WorkComposerSubmitPayload,
} from "@/components/work-composer";
import { useWebSocket } from "@/hooks/use-websocket";
import type { chatAnswer, chatQuestions, chats } from "@repo/db";
import { Button } from "@repo/ui/components/button";
import {
  ArrowDown,
  FolderKanban,
  Loader2,
  MessageSquareOff,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

type Chat = typeof chats.$inferSelect;
type ChatQuestion = typeof chatQuestions.$inferSelect;
type ChatAnswer = typeof chatAnswer.$inferSelect;
type ChatTurn = ChatQuestion & { answer: ChatAnswer | null };
type PersistedChatTurn = ChatQuestion & { chatAnswer: ChatAnswer | null };

type AnswerDelta = {
  chatId: string;
  questionId: string;
  answerId: string;
  answerDelta: string;
  reasoningDelta: string;
  memory?: string;
  steps?: ChatAnswer["steps"];
  usage?: ChatAnswer["usage"];
  finishReason?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function TaggedQuestion({ question }: { question: ChatQuestion }) {
  const content: ReactNode[] = [];

  question.question.split(/(@\{\{\d+\}\})/g).forEach((part, index) => {
    const token = part.match(/^@\{\{(\d+)\}\}$/);
    const mention = token
      ? question.payload.mentions[Number(token[1]) - 1]
      : undefined;

    if (!mention) {
      content.push(part);
      return;
    }

    content.push(
      <span
        key={`${mention.id}-${index}`}
        className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 font-medium text-blue-600 dark:text-blue-400"
      >
        <FolderKanban className="size-3.5" />@{mention.name}
      </span>,
    );
  });

  return content;
}

function ChatResponse({
  answer,
  isStreaming,
}: {
  answer: ChatAnswer | null;
  isStreaming: boolean;
}) {
  const reasoning = answer?.reasoning?.trim();
  const response = answer?.answer.trim();

  return (
    <div>
      {reasoning ? (
        <details className="bg-muted/50 text-muted-foreground mb-4 rounded-lg px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">Reasoning</summary>
          <p className="mt-3 whitespace-pre-wrap">{reasoning}</p>
        </details>
      ) : null}

      {response ? <MarkdownRenderer content={response} /> : null}

      {isStreaming && !response ? (
        <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Thinking…
        </div>
      ) : null}
    </div>
  );
}

function ChatTurnView({
  turn,
  isStreaming = false,
}: {
  turn: ChatTurn;
  isStreaming?: boolean;
}) {
  return (
    <article className="flex flex-col gap-8">
      <div className="flex justify-end">
        <div className="bg-muted text-foreground max-w-[90%] rounded-2xl border px-4 py-3 text-base leading-relaxed break-words shadow-sm md:max-w-[65%]">
          <TaggedQuestion question={turn} />
        </div>
      </div>
      <ChatResponse answer={turn.answer} isStreaming={isStreaming} />
    </article>
  );
}

function upsertTurn(turns: ChatTurn[], nextTurn: ChatTurn) {
  const existingIndex = turns.findIndex((turn) => turn.id === nextTurn.id);
  const nextTurns =
    existingIndex === -1
      ? [...turns, nextTurn]
      : turns.map((turn, index) => (index === existingIndex ? nextTurn : turn));

  return nextTurns.sort(
    (left, right) => left.order_number - right.order_number,
  );
}

export default function ChatClientView({ chatId }: { chatId: string }) {
  const { status, isConnected, sendJsonMessage, subscribeJsonMessage } =
    useWebSocket();
  const [chat, setChat] = useState<Chat | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [streamingTurn, setStreamingTurn] = useState<ChatTurn | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAreaRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const hasLoadedChatRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
      shouldStickToBottomRef.current = true;
      setShowScrollButton(false);
    });
  }, []);

  useEffect(() => {
    setChat(null);
    setTurns([]);
    setStreamingTurn(null);
    setIsLoading(true);
    setIsNotFound(false);
    setLoadError(null);
    setIsSending(false);
    hasLoadedChatRef.current = false;
  }, [chatId]);

  useEffect(() => {
    const unsubscribe = subscribeJsonMessage((message) => {
      if (message.type === "chat-data") {
        if (!isRecord(message.data)) {
          setLoadError("The server returned an invalid chat response.");
          setIsLoading(false);
          return;
        }

        const data = message.data as {
          chat?: Chat | null;
          chatQuestions?: PersistedChatTurn[];
        };

        if (!data.chat || data.chat.id !== chatId) {
          setIsNotFound(true);
          setIsLoading(false);
          return;
        }

        hasLoadedChatRef.current = true;
        setChat(data.chat);
        setStreamingTurn(null);
        setIsSending(false);
        setTurns(
          (Array.isArray(data.chatQuestions) ? data.chatQuestions : []).map(
            ({ chatAnswer, ...question }) => ({
              ...question,
              answer: chatAnswer,
            }),
          ),
        );
        setIsLoading(false);
        window.setTimeout(() => scrollToBottom(), 0);
        return;
      }

      if (message.type === "stream-question-started") {
        if (!isRecord(message.data)) return;
        const turn = message.data as ChatTurn;
        if (turn.chat_id !== chatId) return;

        setStreamingTurn(turn);
        setIsSending(false);
        scrollToBottom("smooth");
        return;
      }

      if (message.type === "answer-delta") {
        if (!isRecord(message.data)) return;
        const delta = message.data as AnswerDelta;
        if (delta.chatId !== chatId) return;

        setStreamingTurn((current) => {
          if (
            !current?.answer ||
            current.id !== delta.questionId ||
            current.answer.id !== delta.answerId
          ) {
            return current;
          }

          return {
            ...current,
            answer: {
              ...current.answer,
              answer: current.answer.answer + delta.answerDelta,
              reasoning:
                (current.answer.reasoning ?? "") + delta.reasoningDelta,
              memory: delta.memory ?? current.answer.memory,
              steps: delta.steps ?? current.answer.steps,
              usage: delta.usage ?? current.answer.usage,
              finish_reason: delta.finishReason ?? current.answer.finish_reason,
            },
          };
        });

        if (shouldStickToBottomRef.current) scrollToBottom();
        return;
      }

      if (message.type === "new-question") {
        if (!isRecord(message.data)) return;
        const turn = message.data as ChatTurn;
        if (turn.chat_id !== chatId) return;

        setTurns((current) => upsertTurn(current, turn));
        setStreamingTurn((current) =>
          current?.id === turn.id ? null : current,
        );
        setIsSending(false);
        scrollToBottom("smooth");
        return;
      }

      if (message.type === "error") {
        const errorMessage =
          isRecord(message.data) && typeof message.data.error === "string"
            ? message.data.error
            : "The chat request failed";
        setIsSending(false);
        setStreamingTurn(null);

        if (!hasLoadedChatRef.current) {
          setLoadError(errorMessage);
          setIsLoading(false);
          return;
        }

        toast.error(errorMessage);
      }
    });

    if (isConnected) {
      const joined = sendJsonMessage({
        type: "join-chat",
        data: { id: chatId },
      });

      if (!joined) setIsLoading(true);
    }

    return unsubscribe;
  }, [
    chatId,
    isConnected,
    scrollToBottom,
    sendJsonMessage,
    subscribeJsonMessage,
  ]);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    scrollToBottom();
  }, [scrollToBottom, streamingTurn?.answer?.answer.length, turns.length]);

  const handleScroll = () => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const distanceFromBottom =
      scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom <= 120;
    setShowScrollButton(distanceFromBottom > 80);
  };

  const submitQuestion = (payload: WorkComposerSubmitPayload) => {
    if (!isConnected || streamingTurn || isSending) return false;

    const sent = sendJsonMessage({
      type: "new-question",
      data: {
        chatId,
        question: payload.message,
        payload: {
          mentions: payload.tagged.map((tag) => ({
            type: tag.type,
            id: tag.data.id,
            name: tag.data.name,
          })),
        },
      },
    });

    if (!sent) {
      toast.error("Chat service is still connecting. Please try again.");
      return false;
    }

    setIsSending(true);
    scrollToBottom("smooth");
    return true;
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-svh items-center justify-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        {status === "connected" ? "Loading chat…" : "Connecting to chat…"}
      </div>
    );
  }

  if (isNotFound || !chat) {
    return (
      <div className="flex h-svh items-center justify-center px-6">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <span className="bg-muted flex size-11 items-center justify-center rounded-full">
            <MessageSquareOff className="text-muted-foreground size-5" />
          </span>
          <h1 className="font-medium">
            {loadError ? "Could not load chat" : "Chat not found"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {loadError ??
              "This chat does not exist or you do not have access to it."}
          </p>
        </div>
      </div>
    );
  }

  const isStreaming = streamingTurn !== null;
  const composerPlaceholder = !isConnected
    ? "Reconnecting…"
    : isStreaming
      ? "Wait for the current response to finish"
      : "Ask a follow-up question";

  return (
    <div className="bg-background text-foreground relative flex h-svh min-h-0 w-full flex-col">
      <main
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 py-8 md:px-8 md:py-12">
          {turns.map((turn) => (
            <ChatTurnView key={turn.id} turn={turn} />
          ))}
          {streamingTurn ? (
            <ChatTurnView turn={streamingTurn} isStreaming />
          ) : null}
          <div ref={bottomRef} aria-hidden="true" />
        </div>
      </main>

      {showScrollButton ? (
        <Button
          type="button"
          size="icon"
          className="absolute right-1/2 bottom-28 z-10 size-10 translate-x-1/2 rounded-full shadow-md"
          aria-label="Scroll to latest message"
          onClick={() => scrollToBottom("smooth")}
        >
          <ArrowDown className="size-4" />
        </Button>
      ) : null}

      <div className="bg-background/90 shrink-0 px-4 pt-2 pb-4 backdrop-blur md:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <WorkComposer
            onSubmit={submitQuestion}
            disabled={!isConnected || isStreaming}
            isSubmitting={isSending}
            placeholder={composerPlaceholder}
            showHeading={false}
            variant="compact"
          />
        </div>
      </div>
    </div>
  );
}
