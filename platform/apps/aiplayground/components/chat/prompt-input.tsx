"use client";

import type {
  OpencodeInventory,
  OpencodePromptSelection,
} from "@repo/api-client";
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
import { ArrowUp, ChevronsUpDown, Plus, Square, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type LocalAttachment = {
  id: string;
  file: File;
  previewUrl: string;
};

type PromptInputProps = {
  onSubmit: (question: string, attachments: File[]) => void;
  disabled?: boolean;
  submitDisabled?: boolean;
  isStreaming?: boolean;
  isStopping?: boolean;
  onStop?: () => void;
  onSubmitSuccess?: () => void;
  inventory?: OpencodeInventory;
  selection: OpencodePromptSelection;
  onSelectionChange: (selection: OpencodePromptSelection) => void;
  autoFocus?: boolean;
  focusOnTyping?: boolean;
  trailingControl?: ReactNode;
};

export function PromptInput({
  onSubmit,
  disabled = false,
  submitDisabled = false,
  isStreaming = false,
  isStopping = false,
  onStop,
  onSubmitSuccess,
  inventory,
  selection,
  onSelectionChange,
  autoFocus = false,
  focusOnTyping = false,
  trailingControl,
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
    disabled || submitDisabled || (!hasQuestion && attachments.length === 0);
  const selectedModel = inventory?.models.find(
    (model) => model.id === selection.model,
  );
  const selectedAgent = inventory?.agents.find(
    (agent) => agent.id === selection.agent,
  );

  useEffect(() => {
    if (
      !autoFocus ||
      disabled ||
      window.matchMedia("(max-width: 767px)").matches
    ) {
      return;
    }

    textareaRef.current?.focus();
  }, [autoFocus, disabled]);

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

  useEffect(() => {
    if (!focusOnTyping || disabled) return;

    const focusPromptOnTyping = (event: globalThis.KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.isComposing ||
        event.key.length !== 1
      ) {
        return;
      }

      const activeElement = document.activeElement;
      if (
        activeElement &&
        activeElement !== document.body &&
        activeElement !== document.documentElement
      ) {
        return;
      }

      textareaRef.current?.focus();
    };

    window.addEventListener("keydown", focusPromptOnTyping);
    return () => window.removeEventListener("keydown", focusPromptOnTyping);
  }, [disabled, focusOnTyping]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) return;

    const trimmedQuestion = textareaRef.current?.value.trim() ?? "";
    onSubmit(
      trimmedQuestion,
      attachments.map((attachment) => attachment.file),
    );
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }
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
      requestAnimationFrame(() => resizeTextarea(textarea));
      return;
    }

    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  const resizeTextarea = (textarea: HTMLTextAreaElement) => {
    const maxHeight = 160;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="relative flex w-full flex-col gap-3"
    >
      <div className="flex min-w-0 [scrollbar-width:none] items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {inventory?.models.length ? (
          <Popover open={isModelPickerOpen} onOpenChange={setIsModelPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled}
                aria-label="Choose model"
                title={selectedModel?.name ?? "Choose model"}
                className="h-10 max-w-64 shrink-0 justify-between gap-2 rounded-full px-4 font-normal"
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
                variant="secondary"
                size="sm"
                disabled={disabled}
                aria-label="Choose model variant"
                title={selection.variant ?? "Choose model variant"}
                className="h-10 max-w-48 shrink-0 justify-between gap-2 rounded-full px-4 font-normal"
              >
                <span className="truncate">
                  {selection.variant ?? "Default variant"}
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
          <Popover open={isAgentPickerOpen} onOpenChange={setIsAgentPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled}
                aria-label="Choose agent"
                title={selectedAgent?.name ?? "Choose agent"}
                className="h-10 max-w-56 shrink-0 justify-between gap-2 rounded-full px-4 font-normal"
              >
                <span className="truncate">
                  {selectedAgent?.name ?? "Choose agent"}
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

        {trailingControl ? (
          <div className="ml-auto shrink-0">{trailingControl}</div>
        ) : null}
      </div>

      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-3 px-1">
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        multiple
        tabIndex={-1}
        onChange={handleFiles}
      />
      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          disabled={disabled}
          className="size-12 shrink-0 rounded-full border"
          aria-label="Add an attachment"
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus className="size-6" />
        </Button>

        <div className="bg-card focus-within:border-foreground/20 flex min-w-0 flex-1 items-end overflow-hidden rounded-[28px] border py-1.5 pr-1.5 pl-1 shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            aria-label="Write an AI message"
            placeholder="Work on anything"
            disabled={disabled}
            onChange={(event) => {
              setHasQuestion(event.target.value.trim().length > 0);
              resizeTextarea(event.target);
            }}
            onKeyDown={handleKeyDown}
            className="placeholder:text-muted-foreground min-h-10 min-w-0 flex-1 resize-none overflow-y-hidden border-0 bg-transparent px-4 py-2 text-base leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
          />

          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              disabled={isStopping}
              className="size-10 shrink-0 rounded-full"
              aria-label={isStopping ? "Stopping response" : "Stop response"}
              title={isStopping ? "Stopping…" : "Stop response"}
              onClick={onStop}
            >
              <Square className="size-4 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={isSubmitDisabled}
              className="size-10 shrink-0 rounded-full"
              aria-label="Submit message"
            >
              <ArrowUp className="size-6" strokeWidth={2.5} />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
