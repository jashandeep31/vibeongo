"use client";

import type {
  OpencodeInventory,
  OpencodePromptSelection,
} from "@/services/opencode-services";
import { Button } from "@repo/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { ArrowUp, ChevronsUpDown, Plus, X } from "lucide-react";
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
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isVariantPickerOpen, setIsVariantPickerOpen] = useState(false);
  const [isAgentPickerOpen, setIsAgentPickerOpen] = useState(false);
  const attachmentsRef = useRef<LocalAttachment[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSubmitDisabled =
    disabled || (!hasQuestion && attachments.length === 0);
  const selectedModel = inventory?.models.find(
    (model) => model.id === selection.model,
  );
  const selectedAgent = inventory?.agents.find(
    (agent) => agent.id === selection.agent,
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
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      const textarea = event.currentTarget;
      textarea.setRangeText(
        "\n",
        textarea.selectionStart,
        textarea.selectionEnd,
        "end",
      );
      setHasQuestion(textarea.value.trim().length > 0);
      return;
    }

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
              <Popover
                open={isModelPickerOpen}
                onOpenChange={setIsModelPickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Choose model"
                    className="max-w-52 justify-between gap-2 font-normal"
                  >
                    <span className="truncate">
                      {selectedModel?.name ?? "Choose model"}
                    </span>
                    <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="top"
                  className="w-80 gap-0 overflow-hidden p-0"
                >
                  <Command>
                    <CommandInput autoFocus placeholder="Search models..." />
                    <CommandList className="max-h-72">
                      <CommandEmpty>No models found.</CommandEmpty>
                      <CommandGroup>
                        {inventory.models.map((model) => (
                          <CommandItem
                            key={model.id}
                            value={`${model.name} ${model.providerName} ${model.id}`}
                            data-checked={
                              selection.model === model.id ? true : undefined
                            }
                            onSelect={() => {
                              onSelectionChange({
                                ...selection,
                                model: model.id,
                                variant: undefined,
                              });
                              setIsModelPickerOpen(false);
                            }}
                          >
                            <span className="flex min-w-0 flex-1 flex-col items-start">
                              <span className="truncate">{model.name}</span>
                              <span className="text-muted-foreground text-xs">
                                {model.providerName}
                              </span>
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : null}

            {selectedModel?.variants.length ? (
              <Popover
                open={isVariantPickerOpen}
                onOpenChange={setIsVariantPickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Choose model variant"
                    className="max-w-40 justify-between gap-2 font-normal"
                  >
                    <span className="truncate">
                      {selection.variant ?? "Variant"}
                    </span>
                    <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="top"
                  className="w-64 gap-0 overflow-hidden p-0"
                >
                  <Command>
                    <CommandInput autoFocus placeholder="Search variants..." />
                    <CommandList className="max-h-72">
                      <CommandEmpty>No variants found.</CommandEmpty>
                      <CommandGroup>
                        {selectedModel.variants.map((variant) => (
                          <CommandItem
                            key={variant}
                            value={variant}
                            data-checked={
                              selection.variant === variant ? true : undefined
                            }
                            onSelect={() => {
                              onSelectionChange({ ...selection, variant });
                              setIsVariantPickerOpen(false);
                            }}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {variant}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : null}

            {inventory?.agents.length ? (
              <Popover
                open={isAgentPickerOpen}
                onOpenChange={setIsAgentPickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Choose agent"
                    className="max-w-40 justify-between gap-2 font-normal"
                  >
                    <span className="truncate">
                      {selectedAgent?.name ?? "Agent"}
                    </span>
                    <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="top"
                  className="w-72 gap-0 overflow-hidden p-0"
                >
                  <Command>
                    <CommandInput autoFocus placeholder="Search agents..." />
                    <CommandList className="max-h-72">
                      <CommandEmpty>No agents found.</CommandEmpty>
                      <CommandGroup>
                        {inventory.agents.map((agent) => (
                          <CommandItem
                            key={agent.id}
                            value={`${agent.name} ${agent.description ?? ""}`}
                            data-checked={
                              selection.agent === agent.id ? true : undefined
                            }
                            onSelect={() => {
                              onSelectionChange({
                                ...selection,
                                agent: agent.id,
                              });
                              setIsAgentPickerOpen(false);
                            }}
                          >
                            <span className="flex min-w-0 flex-1 flex-col items-start">
                              <span className="truncate">{agent.name}</span>
                              {agent.description ? (
                                <span className="text-muted-foreground line-clamp-1 text-xs">
                                  {agent.description}
                                </span>
                              ) : null}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
