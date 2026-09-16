"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@repo/ui/components/button";
import { Send } from "lucide-react";

type PromptInputProps = {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  onSubmitSuccess?: () => void;
  ariaLabel?: string;
  placeholder?: string;
  submitLabel?: string;
};

export function PromptInput({
  onSubmit,
  disabled = false,
  onSubmitSuccess,
  ariaLabel = "Describe what you want to build",
  placeholder = "Describe the app, repo workflow, or development environment you want to run...",
  submitLabel = "Submit prompt",
}: PromptInputProps) {
  const [question, setQuestion] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const trimmedQuestion = question.trim();
  const isSubmitDisabled = disabled || !trimmedQuestion;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) return;

    onSubmit(trimmedQuestion);
    setQuestion("");
    onSubmitSuccess?.();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;

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
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={handleKeyDown}
        className="placeholder:text-muted-foreground/50 min-h-[80px] w-full resize-none overflow-y-auto border-0 p-2 text-base leading-normal outline-none [scrollbar-width:none] focus:outline-none focus-visible:ring-0 focus-visible:outline-none md:min-h-[120px] md:text-base [&::-webkit-scrollbar]:hidden"
      />
      <div className="flex items-center justify-end p-2">
        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className="bg-primary text-primary-foreground h-12 w-12 rounded-full shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95"
          size="icon"
        >
          <Send className="h-5 w-5" />
          <span className="sr-only">{submitLabel}</span>
        </Button>
      </div>
    </form>
  );
}
