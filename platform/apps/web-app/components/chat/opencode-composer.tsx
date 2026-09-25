"use client";

import {
  OpencodeProviderConnectDialog,
  type OpencodeWebProviderConnection,
} from "@/components/chat/opencode-provider-connect-dialog";
import type {
  OpencodeFileReference,
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
import {
  ArrowUp,
  ChevronsUpDown,
  File,
  Loader2,
  ListPlus,
  Plus,
  Square,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

type LocalAttachment = {
  id: string;
  file: File;
  previewUrl?: string;
};

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

type OpencodeComposerProps = {
  onSubmit: (
    question: string,
    attachments: File[],
    fileReferences: OpencodeFileReference[],
  ) => void;
  disabled?: boolean;
  submitDisabled?: boolean;
  isStreaming?: boolean;
  isStopping?: boolean;
  queueWhenStreaming?: boolean;
  onStop?: () => void;
  onSubmitSuccess?: () => void;
  inventory?: OpencodeInventory;
  selection: OpencodePromptSelection;
  onSelectionChange: (selection: OpencodePromptSelection) => void;
  autoFocus?: boolean;
  focusOnTyping?: boolean;
  trailingControl?: ReactNode;
  searchFiles?: (query: string) => Promise<string[]>;
  providerConnection?: OpencodeWebProviderConnection;
};

type ActiveFileMention = { end: number; query: string; start: number };

function getActiveFileMention(value: string, cursor: number) {
  const match = value.slice(0, cursor).match(/(?:^|\s)@([^\s@]*)$/);
  if (!match) return null;
  const query = match[1] ?? "";
  return { end: cursor, query, start: cursor - query.length - 1 };
}

export function OpencodeComposer({
  onSubmit,
  disabled = false,
  submitDisabled = false,
  isStreaming = false,
  isStopping = false,
  queueWhenStreaming = false,
  onStop,
  onSubmitSuccess,
  inventory,
  selection,
  onSelectionChange,
  autoFocus = false,
  focusOnTyping = false,
  trailingControl,
  searchFiles,
  providerConnection,
}: OpencodeComposerProps) {
  const [hasQuestion, setHasQuestion] = useState(false);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isVariantPickerOpen, setIsVariantPickerOpen] = useState(false);
  const [isAgentPickerOpen, setIsAgentPickerOpen] = useState(false);
  const [isProviderConnectOpen, setIsProviderConnectOpen] = useState(false);
  const [activeFileMention, setActiveFileMention] =
    useState<ActiveFileMention | null>(null);
  const [fileReferences, setFileReferences] = useState<OpencodeFileReference[]>(
    [],
  );
  const [fileSuggestions, setFileSuggestions] = useState<string[]>([]);
  const [isSearchingFiles, setIsSearchingFiles] = useState(false);
  const [highlightedFileIndex, setHighlightedFileIndex] = useState(0);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
  const activeFileQuery = activeFileMention?.query;
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
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
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

  useEffect(() => {
    if (!searchFiles || activeFileQuery === undefined) {
      setFileSuggestions([]);
      setIsSearchingFiles(false);
      return;
    }

    let active = true;
    setIsSearchingFiles(true);
    setHighlightedFileIndex(0);
    const timeout = window.setTimeout(() => {
      void searchFiles(activeFileQuery)
        .then((paths) => {
          if (active) setFileSuggestions(paths);
        })
        .catch(() => {
          if (active) setFileSuggestions([]);
        })
        .finally(() => {
          if (active) setIsSearchingFiles(false);
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [activeFileQuery, searchFiles]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) return;

    const trimmedQuestion = textareaRef.current?.value.trim() ?? "";
    onSubmit(
      trimmedQuestion,
      attachments.map((attachment) => attachment.file),
      fileReferences.filter((reference) =>
        trimmedQuestion.includes(reference.mention),
      ),
    );
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }
    setHasQuestion(false);
    setActiveFileMention(null);
    setFileReferences([]);
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    });
    setAttachments([]);
    onSubmitSuccess?.();
  };

  const addAttachments = (files: File[]) => {
    const accepted = files.filter((file) => file.size <= MAX_ATTACHMENT_BYTES);
    const selected = accepted.slice(0, MAX_ATTACHMENTS - attachments.length);
    if (selected.length !== files.length) {
      toast.error("Attach up to five files, each 20 MiB or smaller.");
    }
    setAttachments([
      ...attachments,
      ...selected.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      })),
    ]);
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    addAttachments(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    const files = Array.from(event.clipboardData.files);
    if (files.length === 0) return;
    event.preventDefault();
    addAttachments(files);
  };

  const handleDrop = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsDraggingAttachment(false);
    if (disabled) return;
    addAttachments(Array.from(event.dataTransfer.files));
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) =>
      current.filter((attachment) => {
        if (attachment.id !== id) return true;
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
        return false;
      }),
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (activeFileMention && fileSuggestions.length > 0) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setHighlightedFileIndex(
          (current) =>
            (current + direction + fileSuggestions.length) %
            fileSuggestions.length,
        );
        return;
      }
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        const path = fileSuggestions[highlightedFileIndex];
        if (path) chooseFile(path);
        return;
      }
    }
    if (event.key === "Escape" && activeFileMention) {
      setActiveFileMention(null);
      return;
    }
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

  const chooseFile = (path: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !activeFileMention) return;
    const mention = `@${path}`;
    textarea.setRangeText(
      `${mention} `,
      activeFileMention.start,
      activeFileMention.end,
      "end",
    );
    setHasQuestion(textarea.value.trim().length > 0);
    setFileReferences((current) => [
      ...current.filter((reference) => reference.path !== path),
      { mention, path },
    ]);
    setActiveFileMention(null);
    setFileSuggestions([]);
    resizeTextarea(textarea);
    textarea.focus();
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDraggingAttachment(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target)
          setIsDraggingAttachment(false);
      }}
      onDrop={handleDrop}
      className={`relative flex w-full flex-col gap-3 rounded-[28px] ${
        isDraggingAttachment ? "ring-primary/50 ring-2" : ""
      }`}
    >
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-3 px-1">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="relative">
              {attachment.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.previewUrl}
                  alt={attachment.file.name}
                  className="size-20 rounded-xl border object-cover"
                />
              ) : (
                <div className="bg-muted flex h-20 w-36 items-center gap-2 rounded-xl border px-3 text-sm">
                  <File className="text-muted-foreground size-5 shrink-0" />
                  <span className="min-w-0 truncate" title={attachment.file.name}>
                    {attachment.file.name}
                  </span>
                </div>
              )}
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

      <div className="flex min-w-0 [scrollbar-width:none] items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {inventory?.models.length || providerConnection ? (
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
                    {(inventory?.models ?? []).map((model) => (
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
              {providerConnection ? (
                <button
                  className="hover:bg-muted flex min-h-12 w-full items-center gap-2 border-t px-4 text-left text-sm font-medium"
                  onClick={() => {
                    setIsModelPickerOpen(false);
                    window.setTimeout(() => setIsProviderConnectOpen(true), 0);
                  }}
                  type="button"
                >
                  <Plus className="size-4" />
                  Connect provider
                </button>
              ) : null}
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
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {trailingControl}
          </div>
        ) : null}
      </div>
      {providerConnection ? (
        <OpencodeProviderConnectDialog
          connection={providerConnection}
          onOpenChange={setIsProviderConnectOpen}
          open={isProviderConnectOpen}
        />
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        tabIndex={-1}
        onChange={handleFiles}
      />
      {activeFileMention && searchFiles ? (
        <div className="bg-popover text-popover-foreground max-h-64 overflow-y-auto rounded-xl border p-1 shadow-lg">
          {isSearchingFiles ? (
            <div className="text-muted-foreground flex h-12 items-center justify-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" /> Searching files…
            </div>
          ) : fileSuggestions.length ? (
            fileSuggestions.map((path, index) => (
              <button
                key={path}
                type="button"
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  index === highlightedFileIndex
                    ? "bg-accent"
                    : "hover:bg-accent"
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseFile(path)}
              >
                <File className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0 truncate font-mono text-xs [direction:rtl]">
                  {path}
                </span>
              </button>
            ))
          ) : (
            <div className="text-muted-foreground flex h-12 items-center justify-center text-sm">
              No files found.
            </div>
          )}
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          disabled={disabled || attachments.length >= MAX_ATTACHMENTS}
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
              setActiveFileMention(
                getActiveFileMention(
                  event.target.value,
                  event.target.selectionStart,
                ),
              );
              setFileReferences((current) =>
                current.filter((reference) =>
                  event.target.value.includes(reference.mention),
                ),
              );
              resizeTextarea(event.target);
            }}
            onClick={(event) =>
              setActiveFileMention(
                getActiveFileMention(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart,
                ),
              )
            }
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="placeholder:text-muted-foreground min-h-10 min-w-0 flex-1 resize-none overflow-y-hidden border-0 bg-transparent px-4 py-2 text-base leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
          />

          {isStreaming ? (
            <>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={isStopping}
                className="size-10 shrink-0 rounded-full"
                aria-label={isStopping ? "Stopping response" : "Stop response"}
                title={isStopping ? "Stopping…" : "Stop response"}
                onClick={onStop}
              >
                <Square className="size-4 fill-current" />
              </Button>
              {queueWhenStreaming ? (
                <Button
                  type="submit"
                  size="icon"
                  disabled={isSubmitDisabled}
                  className="size-10 shrink-0 rounded-full"
                  aria-label="Queue message"
                  title="Queue message"
                >
                  <ListPlus className="size-5" />
                </Button>
              ) : null}
            </>
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
