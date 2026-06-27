"use client";
import { ChatQuestion } from "@/components/chat/chat-question";
import { InputArea } from "@/components/chat/input-area";
import { useVibeSocket } from "@/hooks/use-vibe-socket";
import { chatStore, type IChatQuestion } from "@/store/chat-store";
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

  return (
    <>
      {chatQuestionsList.map((item) => (
        <ChatQuestion key={item.id} item={item} />
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

  return <ChatQuestion item={streamingQuestion} />;
};

const ClientView = ({ chatid }: ClientViewProps) => {
  const { websocket, sendJsonMessage } = useVibeSocket();
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const setQuestions = chatStore((state) => state.setQuestions);
  const setStreamingQuestion = chatStore((state) => state.setStreamingQuestion);
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

    setShowScrollButton(distanceFromBottom > 50);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    scrollArea.scrollTo({
      top: scrollArea.scrollHeight,
      behavior,
    });
    setShowScrollButton(false);
  }, []);

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
        requestAnimationFrame(() => {
          scrollToBottom();
        });
        return;
      }

      if (parsedEvent.type === "stream-question") {
        setStreamingQuestion(parsedEvent.data as QuestionEventData);
        return;
      }

      if (parsedEvent.type === "new-question") {
        const question = parsedEvent.data as QuestionEventData;
        upsertFinalQuestion(question);
        clearStreamingQuestion(question.id);
        return;
      }

      if (parsedEvent.type === "answer-update") {
        const answer = parsedEvent.data as typeof chatAnswer.$inferSelect;
        const question = chatStore
          .getState()
          .chatQuestionsList.find(
            (item) =>
              item.id === answer.question_id || item.answer?.id === answer.id,
          );

        if (question) {
          upsertFinalQuestion({
            ...question,
            answer,
          });
        }
      }
    };

    websocket.addEventListener("message", handleMessage);
    return () => {
      websocket.removeEventListener("message", handleMessage);
    };
  }, [
    chatid,
    clearStreamingQuestion,
    scrollToBottom,
    setQuestions,
    setStreamingQuestion,
    upsertFinalQuestion,
    websocket,
  ]);

  return (
    <div className="bg-background text-foreground relative flex h-[calc(100vh-3rem)] flex-col justify-between">
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
