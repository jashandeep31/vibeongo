"use client";
import { InputArea } from "@/components/chat/input-area";
import { useVibeSocket } from "@/hooks/use-vibe-socket";
import { chatAnswer, chatQuestions, chats } from "@repo/db";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ClientViewProps {
  chatid: string;
}

type ChatQuestionWithAnswer = typeof chatQuestions.$inferSelect & {
  chatAnswer: typeof chatAnswer.$inferSelect | null;
};

const ClientView = ({ chatid }: ClientViewProps) => {
  const { websocket, sendJsonMessage } = useVibeSocket();
  const [chat, setChat] = useState<null | typeof chats.$inferSelect>(null);
  const [chatQWithA, setChatQWithA] = useState<ChatQuestionWithAnswer[]>([]);

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
        setChatQWithA(parsedEvent.data.chatQuestions ?? []);
      }
    };

    websocket.addEventListener("message", handleMessage);
    return () => {
      websocket.removeEventListener("message", handleMessage);
    };
  }, [websocket, chatid]);

  return (
    <div className="bg-background text-foreground flex max-h-[95vh] flex-col justify-between">
      <div className="grid overflow-y-scroll">
        <div className="flex-1 px-4 py-8 md:px-8">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
            {chatQWithA.length === 0 ? (
              <div className="text-muted-foreground flex min-h-[45vh] items-center justify-center text-sm">
                Start the chat by describing what you want to build.
              </div>
            ) : (
              chatQWithA.map((item) => {
                const answer = item.chatAnswer;

                return (
                  <div key={item.id} className="flex flex-col gap-8">
                    <div className="flex justify-end">
                      <div className="bg-muted text-foreground border-border max-w-[70%] rounded-2xl border px-5 py-4 text-base leading-relaxed shadow-sm md:max-w-[55%]">
                        {item.question}
                      </div>
                    </div>

                    <div className="max-w-3xl">
                      <p className="text-foreground text-lg leading-snug whitespace-pre-wrap">
                        {answer?.answer}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 md:px-0">
        <div className="mx-auto w-full md:w-2/3">
          <InputArea sendJsonMessage={sendJsonMessage} />
        </div>
      </div>
    </div>
  );
};

export default ClientView;
