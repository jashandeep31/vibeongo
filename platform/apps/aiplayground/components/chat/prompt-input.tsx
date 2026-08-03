"use client";

import { Button } from "@repo/ui/components/button";
import { ArrowUp, Plus, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

type LocalAttachment = {
  id: string;
  file: File;
  previewUrl: string;
};

type PromptInputProps = {
  onSubmit: (question: string, attachments: File[]) => void;
  disabled?: boolean;
  onSubmitSuccess?: () => void;
};

export function PromptInput({
  onSubmit,
  disabled = false,
  onSubmitSuccess,
}: PromptInputProps) {
  const [question, setQuestion] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const attachmentsRef = useRef<LocalAttachment[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trimmedQuestion = question.trim();
  const isSubmitDisabled =
    disabled || (!trimmedQuestion && attachments.length === 0);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(
    () => () => {
      attachmentsRef.current.forEach((attachment) => {
        URL.revokeObjectURL(attachment.previewUrl);
      });
    },
    [],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) return;

    onSubmit(
      trimmedQuestion,
      attachments.map((attachment) => attachment.file),
    );
    setQuestion("");
    attachments.forEach((attachment) => {
      URL.revokeObjectURL(attachment.previewUrl);
    });
    setAttachments([]);
    onSubmitSuccess?.();
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );

    setAttachments((current) => [
      ...current,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    event.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) =>
      current.filter((attachment) => {
        if (attachment.id !== id) return true;
        URL.revokeObjectURL(attachment.previewUrl);
        return false;
      }),
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;

    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="relative w-full">
      <div className="bg-card focus-within:border-foreground/20 relative overflow-hidden rounded-[28px] border shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-colors">
        {attachments.length > 0 ? (
          <div className="flex flex-wrap gap-3 px-5 pt-5">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.previewUrl}
                  alt={attachment.file.name}
                  className="size-20 rounded-xl border object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove ${attachment.file.name}`}
                  onClick={() => removeAttachment(attachment.id)}
                  className="bg-foreground text-background absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

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
            accept="image/*"
            className="hidden"
            multiple
            tabIndex={-1}
            onChange={handleFiles}
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
