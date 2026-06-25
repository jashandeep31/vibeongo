"use client";

import { Send } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Textarea } from "@repo/ui/components/textarea";
import { useState, type FormEvent } from "react";

interface InputAreaProps {
  sendJsonMessage: (message: unknown) => void;
}

export function InputArea({ sendJsonMessage }: InputAreaProps) {
  const [question, setQuestion] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    console.log(trimmedQuestion);

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
      className="group border-border bg-background/40 focus-within:border-primary/50 focus-within:bg-background dark:bg-background/20 relative w-full rounded-[2rem] border p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm transition-all duration-500 focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
    >
      <Textarea
        aria-label="Describe what you want to build"
        placeholder="Describe the app, repo workflow, or development environment you want to run..."
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        className="placeholder:text-muted-foreground/50 min-h-[120px] resize-none border-0 bg-transparent px-4 py-2 text-lg leading-relaxed font-medium shadow-none focus-visible:ring-0 md:text-xl"
      />
      <div className="mt-2 flex items-center justify-end px-2">
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
