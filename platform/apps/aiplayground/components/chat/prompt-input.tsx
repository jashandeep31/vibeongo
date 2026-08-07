"use client";

import type {
  OpencodeInventory,
  OpencodePromptSelection,
} from "@/services/opencode-services";
import { Button } from "@repo/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
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
  inventory?: OpencodeInventory;
  selection: OpencodePromptSelection;
  onSelectionChange: (selection: OpencodePromptSelection) => void;
};

export function PromptInput({
  onSubmit,
  disabled = false,
  onSubmitSuccess,
  inventory,
  selection,
  onSelectionChange,
}: PromptInputProps) {
  const [hasQuestion, setHasQuestion] = useState(false);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const attachmentsRef = useRef<LocalAttachment[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSubmitDisabled =
    disabled || (!hasQuestion && attachments.length === 0);
  const selectedModel = inventory?.models.find(
    (model) => model.id === selection.model,
  );

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

    const trimmedQuestion = textareaRef.current?.value.trim() ?? "";
    onSubmit(
      trimmedQuestion,
      attachments.map((attachment) => attachment.file),
    );
    if (textareaRef.current) textareaRef.current.value = "";
    setHasQuestion(false);
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
          ref={textareaRef}
          aria-label="Write an AI message"
          placeholder="Work on anything"
          disabled={disabled}
          onChange={(event) =>
            setHasQuestion(event.target.value.trim().length > 0)
          }
          onKeyDown={handleKeyDown}
          className="placeholder:text-muted-foreground min-h-32 w-full resize-none border-0 bg-transparent px-6 pt-6 pb-3 text-base outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-36 sm:text-lg"
        />

        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            multiple
            tabIndex={-1}
            onChange={handleFiles}
          />
          <div className="flex min-w-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="size-11 shrink-0 rounded-full"
              aria-label="Add an attachment"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="size-6" />
            </Button>

            {inventory?.models.length ? (
              <Select
                value={selection.model}
                onValueChange={(model) =>
                  onSelectionChange({
                    ...selection,
                    model,
                    variant: undefined,
                  })
                }
              >
                <SelectTrigger
                  size="sm"
                  aria-label="Choose model"
                  className="max-w-52 border-0 bg-transparent shadow-none"
                >
                  <SelectValue placeholder="Choose model" />
                </SelectTrigger>
                <SelectContent align="start" className="max-h-80 min-w-72">
                  {inventory.models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <span className="flex min-w-0 flex-col items-start">
                        <span>{model.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {model.providerName}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {selectedModel?.variants.length ? (
              <Select
                value={selection.variant}
                onValueChange={(variant) =>
                  onSelectionChange({ ...selection, variant })
                }
              >
                <SelectTrigger
                  size="sm"
                  aria-label="Choose model variant"
                  className="border-0 bg-transparent shadow-none"
                >
                  <SelectValue placeholder="Variant" />
                </SelectTrigger>
                <SelectContent align="start">
                  {selectedModel.variants.map((variant) => (
                    <SelectItem key={variant} value={variant}>
                      {variant}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {inventory?.agents.length ? (
              <Select
                value={selection.agent}
                onValueChange={(agent) =>
                  onSelectionChange({ ...selection, agent })
                }
              >
                <SelectTrigger
                  size="sm"
                  aria-label="Choose agent"
                  className="max-w-32 border-0 bg-transparent shadow-none"
                >
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent align="start">
                  {inventory.agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>

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
