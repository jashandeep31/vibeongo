"use client";

import { Button } from "@repo/ui/components/button";
import { ArrowUp, Plus } from "lucide-react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

type PromptInputProps = {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  onSubmitSuccess?: () => void;
};

export function PromptInput({
  onSubmit,
  disabled = false,
  onSubmitSuccess,
}: PromptInputProps) {
  const [question, setQuestion] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    <form ref={formRef} onSubmit={handleSubmit} className="relative w-full">
      <div className="bg-card focus-within:border-foreground/20 relative overflow-hidden rounded-[28px] border shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-colors">
        <textarea
          aria-label="Write an AI message"
          placeholder="Work on anything"
          value={question}
          disabled={disabled}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
          className="placeholder:text-muted-foreground min-h-32 w-full resize-none border-0 bg-transparent px-6 pt-6 pb-3 text-base outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-36 sm:text-lg"
        />

        <div className="flex items-center justify-between px-4 pb-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            tabIndex={-1}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="size-11 rounded-full"
            aria-label="Add an attachment"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="size-6" />
          </Button>

          <Button
            type="submit"
            size="icon"
            disabled={isSubmitDisabled}
            className="size-12 rounded-full"
            aria-label="Submit message"
          >
            <ArrowUp className="size-6" strokeWidth={2.5} />
          </Button>
        </div>
      </div>
    </form>
  );
}
