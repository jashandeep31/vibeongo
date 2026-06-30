"use client";
import { ChatQuestion } from "@/components/chat/chat-question";
import { InputArea } from "@/components/chat/input-area";
import { useVibeSocket } from "@/hooks/use-vibe-socket";
import {
  chatStore,
  type ChatAnswerDelta,
  type IChatQuestion,
} from "@/store/chat-store";
import { chatAnswer, chatQuestions } from "@repo/db";
import { ArrowDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ClientViewProps {
  chatid: string;
}

type ChatQuestionWithAnswer = typeof chatQuestions.$inferSelect & {
  chatAnswer: typeof chatAnswer.$inferSelect | null;
};

type QuestionEventData = typeof chatQuestions.$inferSelect & {
  answer: typeof chatAnswer.$inferSelect;
};

const ChatHistory = () => {
  const chatQuestionsList = chatStore((state) => state.chatQuestionsList);
  const hasStreamingQuestion = chatStore(
    (state) => state.streamingQuestion !== null,
  );

  return (
    <>
      {chatQuestionsList.map((item, index) => (
        <ChatQuestion
          key={item.id}
          item={item}
          reserveBottomSpace={
            !hasStreamingQuestion && index === chatQuestionsList.length - 1
          }
        />
      ))}
    </>
  );
};

const EmptyChatState = () => {
  const hasQuestions = chatStore((state) => state.chatQuestionsList.length > 0);
  const hasStreamingQuestion = chatStore(
    (state) => state.streamingQuestion !== null,
  );

  if (hasQuestions || hasStreamingQuestion) return null;

  return (
    <div className="text-muted-foreground flex min-h-[45vh] items-center justify-center text-sm">
      Start the chat by describing what you want to build.
    </div>
  );
};

const StreamingQuestion = () => {
  const streamingQuestion = chatStore((state) => state.streamingQuestion);

  if (!streamingQuestion) return null;

  return <ChatQuestion item={streamingQuestion} isStreaming />;
};

const ClientView = ({ chatid }: ClientViewProps) => {
  const { websocket, sendJsonMessage } = useVibeSocket();
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const chatQuestionsList = chatStore((state) => state.chatQuestionsList);
  const streamingQuestion = chatStore((state) => state.streamingQuestion);
  const setQuestions = chatStore((state) => state.setQuestions);
  const setStreamingQuestion = chatStore((state) => state.setStreamingQuestion);
  const appendStreamingAnswerDelta = chatStore(
    (state) => state.appendStreamingAnswerDelta,
  );
  const clearStreamingQuestion = chatStore(
    (state) => state.clearStreamingQuestion,
  );
  const upsertFinalQuestion = chatStore((state) => state.upsertFinalQuestion);
  const updateChat = chatStore((state) => state.updateChat);
  const resetChat = chatStore((state) => state.resetChat);

  const updateScrollButtonVisibility = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const distanceFromBottom =
      scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight;

    shouldStickToBottomRef.current = distanceFromBottom <= 120;
    setShowScrollButton(distanceFromBottom > 50);
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto", force = true) => {
      const performScroll = () => {
        const scrollArea = scrollAreaRef.current;
        if (!scrollArea) return;
        if (!force && !shouldStickToBottomRef.current) return;

        bottomRef.current?.scrollIntoView({
          behavior,
          block: "end",
        });

        scrollArea.scrollTo({
          top: scrollArea.scrollHeight,
          behavior,
        });

        shouldStickToBottomRef.current = true;
        setShowScrollButton(false);
      };

      requestAnimationFrame(performScroll);
      window.setTimeout(performScroll, 100);
    },
    [],
  );

  const streamingQuestionId = streamingQuestion?.id;
  const streamingAnswerLength = streamingQuestion?.answer?.answer.length ?? 0;
  const streamingReasoningLength =
    streamingQuestion?.answer?.reasoning?.length ?? 0;

  useEffect(() => {
    if (!streamingQuestionId) return;
    if (!shouldStickToBottomRef.current) return;

    scrollToBottom("auto", false);
  }, [
    scrollToBottom,
    streamingAnswerLength,
    streamingQuestionId,
    streamingReasoningLength,
  ]);

  useEffect(() => {
    if (!chatQuestionsList.length) return;
    if (!shouldStickToBottomRef.current) return;

    scrollToBottom("auto", false);
  }, [chatQuestionsList.length, scrollToBottom]);

  useEffect(() => {
    updateChat(chatid);

    return () => {
      resetChat();
    };
  }, [chatid, resetChat, updateChat]);

  useEffect(() => {
    if (!websocket) return;

    // Getting the chat from the backend
    websocket.send(
      JSON.stringify({
        type: "join-chat",
        data: {
          id: chatid,
        },
      }),
    );

    const handleMessage = (event: MessageEvent) => {
      const parsedEvent = JSON.parse(event.data);

      if (parsedEvent.type === "chat-data") {
        if (parsedEvent.data.chat?.id && parsedEvent.data.chat.id !== chatid) {
          return;
        }

        const questions = (parsedEvent.data.chatQuestions ?? []).map(
          (question: ChatQuestionWithAnswer): IChatQuestion => {
            const { chatAnswer, ...questionData } = question;
            return {
              ...questionData,
              answer: chatAnswer,
            };
          },
        );

        setQuestions(questions);
        scrollToBottom();
        return;
      }

      if (parsedEvent.type === "stream-question-started") {
        setStreamingQuestion(parsedEvent.data as QuestionEventData);
        return;
      }

      if (parsedEvent.type === "answer-delta") {
        appendStreamingAnswerDelta(parsedEvent.data as ChatAnswerDelta);
        return;
      }

      if (parsedEvent.type === "new-question") {
        const question = parsedEvent.data as QuestionEventData;
        upsertFinalQuestion(question);
        clearStreamingQuestion(question.id, question.chat_id);
        return;
      }
    };

    websocket.addEventListener("message", handleMessage);
    return () => {
      websocket.removeEventListener("message", handleMessage);
    };
  }, [
    chatid,
    appendStreamingAnswerDelta,
    clearStreamingQuestion,
    scrollToBottom,
    setQuestions,
    setStreamingQuestion,
    upsertFinalQuestion,
    websocket,
  ]);

  return (
    <div className="bg-background text-foreground relative flex h-full min-h-0 w-full flex-col justify-between">
      <div
        ref={scrollAreaRef}
        onScroll={updateScrollButtonVisibility}
        className="grid min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex-1 px-4 py-8 md:px-8">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
            <EmptyChatState />
            <ChatHistory />
            <StreamingQuestion />
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
          <InputArea
            chatId={chatid}
            sendJsonMessage={sendJsonMessage}
            onSubmitSuccess={() => scrollToBottom("smooth")}
          />
        </div>
      </div>
    </div>
  );
};

export default ClientView;
