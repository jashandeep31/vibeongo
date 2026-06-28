"use client";

import { Send } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

interface InputAreaProps {
  chatId: string;
  sendJsonMessage: (message: unknown) => void;
  onSubmitSuccess?: () => void;
}

export function InputArea({
  chatId,
  sendJsonMessage,
  onSubmitSuccess,
}: InputAreaProps) {
  const [question, setQuestion] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    sendJsonMessage({
      type: "new-question",
      data: {
        chatId,
        question: trimmedQuestion,
      },
    });

    setQuestion("");
    window.setTimeout(() => {
      requestAnimationFrame(() => {
        onSubmitSuccess?.();
      });
    }, 1000);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || !event.ctrlKey) return;

    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="border-border focus-within:border-primary/50 bg-muted relative w-full rounded-lg border p-0 transition-colors"
    >
      <textarea
        aria-label="Describe what you want to build"
        placeholder="Describe the app, repo workflow, or development environment you want to run..."
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={handleKeyDown}
        className="placeholder:text-muted-foreground/50 min-h-[80px] w-full resize-none overflow-y-auto border-0 p-2 text-base leading-normal outline-none [scrollbar-width:none] focus:outline-none focus-visible:ring-0 focus-visible:outline-none md:min-h-[120px] md:text-base [&::-webkit-scrollbar]:hidden"
      />
      <div className="flex items-center justify-end p-2">
        <Button
          type="submit"
          disabled={!question.trim()}
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
