"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { useVibeSocket } from "@/hooks/use-vibe-socket";

export function NewChatInput() {
  const { websocket, sendJsonMessage } = useVibeSocket();
  const router = useRouter();
  const [question, setQuestion] = useState("");

  useEffect(() => {
    if (!websocket) return;

    const handleNewChatResponse = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;

      let message: unknown;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "new-chat" &&
        "data" in message &&
        typeof message.data === "object" &&
        message.data !== null &&
        "chatId" in message.data &&
        typeof message.data.chatId === "string"
      ) {
        router.push(`/dashboard/project/ai-create/${message.data.chatId}`);
      }
    };

    websocket.addEventListener("message", handleNewChatResponse);
    return () => {
      websocket.removeEventListener("message", handleNewChatResponse);
    };
  }, [router, websocket]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    sendJsonMessage({
      type: "new-chat",
      data: {
        question: trimmedQuestion,
      },
    });

    setQuestion("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border focus-within:border-primary/50 bg-muted relative w-full rounded-lg border p-0 transition-colors"
    >
      <textarea
        aria-label="Describe what you want to build"
        placeholder="Describe the app, repo workflow, or development environment you want to run..."
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        className="placeholder:text-muted-foreground/50 min-h-[80px] w-full resize-none overflow-y-auto border-0 p-2 text-base leading-normal outline-none [scrollbar-width:none] focus:outline-none focus-visible:ring-0 focus-visible:outline-none md:min-h-[120px] md:text-base [&::-webkit-scrollbar]:hidden"
      />
      <div className="flex items-center justify-end p-2">
        <Button
          type="submit"
          disabled={
            !question.trim() || websocket?.readyState !== WebSocket.OPEN
          }
          className="bg-primary text-primary-foreground h-12 w-12 rounded-full shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95"
          size="icon"
        >
          <Send className="h-5 w-5" />
          <span className="sr-only">Submit prompt</span>
        </Button>
      </div>
    </form>
  );
}
