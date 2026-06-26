"use client";
import { InputArea } from "@/components/chat/input-area";
import { useVibeSocket } from "@/hooks/use-vibe-socket";
import { chatStore, type IChatQuestion } from "@/store/chat-store";
import { chatAnswer, chatQuestions, chats } from "@repo/db";
import { Loader2 } from "lucide-react";
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

const ChatQuestion = ({ item }: { item: IChatQuestion }) => {
  const answer = item.answer;
  const reasoning = answer?.reasoning?.trim();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <div className="bg-muted text-foreground border-border max-w-[70%] rounded-2xl border px-5 py-4 text-base leading-relaxed shadow-sm md:max-w-[55%]">
          {item.question}
        </div>
      </div>

      <div className="max-w-3xl">
        {reasoning ? (
          <div className="border-border bg-muted/30 text-muted-foreground mb-4 rounded-lg border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
            {reasoning}
          </div>
        ) : null}

        {answer?.answer ? (
          <p className="text-foreground text-base leading-normal whitespace-pre-wrap">
            {answer.answer}
          </p>
        ) : (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking
          </div>
        )}
      </div>
    </div>
  );
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
  const [chat, setChat] = useState<null | typeof chats.$inferSelect>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const setQuestions = chatStore((state) => state.setQuestions);
  const setStreamingQuestion = chatStore((state) => state.setStreamingQuestion);
  const clearStreamingQuestion = chatStore(
    (state) => state.clearStreamingQuestion,
  );
  const upsertFinalQuestion = chatStore((state) => state.upsertFinalQuestion);
  const updateChat = chatStore((state) => state.updateChat);
  const resetChat = chatStore((state) => state.resetChat);

  const scrollToBottom = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    scrollArea.scrollTop = scrollArea.scrollHeight;
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
        setChat(parsedEvent.data.chat ?? null);
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
        const question = chatStore.getState().chatQuestionsList.find(
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
    <div className="bg-background text-foreground flex h-[calc(100vh-3rem)] flex-col justify-between">
      <div
        ref={scrollAreaRef}
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
      <div className="shrink-0 px-4 pb-4 md:px-0">
        <div className="mx-auto w-full max-w-4xl">
          <InputArea chatId={chatid} sendJsonMessage={sendJsonMessage} />
        </div>
      </div>
    </div>
  );
};

export default ClientView;
