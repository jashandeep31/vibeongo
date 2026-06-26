"use client";

import { Send } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Textarea } from "@repo/ui/components/textarea";
import { useState, type FormEvent } from "react";

interface InputAreaProps {
  chatId: string;
  sendJsonMessage: (message: unknown) => void;
}

export function InputArea({ chatId, sendJsonMessage }: InputAreaProps) {
  const [question, setQuestion] = useState("");

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
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-background focus-within:border-primary/50 relative w-full rounded-[2px] border p-0 transition-colors"
    >
      <Textarea
        aria-label="Describe what you want to build"
        placeholder="Describe the app, repo workflow, or development environment you want to run..."
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        className="placeholder:text-muted-foreground/50 min-h-[120px] resize-none border-0 bg-transparent p-2 text-lg leading-normal shadow-none focus-visible:ring-0 md:text-base"
      />
      <div className="flex items-center justify-end">
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
