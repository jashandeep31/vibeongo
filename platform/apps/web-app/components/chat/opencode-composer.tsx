"use client";

import {
  readComposerDraft,
  saveComposerDraft,
} from "@/lib/opencode-composer-drafts";
import { useVoiceTranscription } from "@/components/chat/use-voice-transcription";
import { VoiceWaveform } from "@/components/chat/voice-waveform";
import {
  OpencodeProviderConnectDialog,
  type OpencodeWebProviderConnection,
} from "@/components/chat/opencode-provider-connect-dialog";
import {
  filterOpencodeCommands,
  getActiveOpencodeSlashCommand,
  type OpencodeCommand,
  type OpencodeFileReference,
  type OpencodeForkDraft,
  type OpencodeInventory,
  type OpencodePromptSelection,
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
  Mic,
  RotateCcw,
  SquareSlash,
  ListPlus,
  Plus,
  Square,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
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
    forkDraft?: OpencodeForkDraft,
  ) => void | Promise<unknown>;
  draftKey?: string;
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
  commands?: OpencodeCommand[];
  onNewChat?: () => void;
  actions?: OpencodeComposerAction[];
};

type ActiveFileMention = { end: number; query: string; start: number };
// App-side slash commands; they run here instead of being sent to OpenCode.
export type OpencodeComposerAction = {
  name: string;
  description: string;
  run: () => void;
};
type ComposerCommand = OpencodeCommand & { run?: () => void };

function getActiveFileMention(value: string, cursor: number) {
  const match = value.slice(0, cursor).match(/(?:^|\s)@([^\s@]*)$/);
  if (!match) return null;
  const query = match[1] ?? "";
  return { end: cursor, query, start: cursor - query.length - 1 };
}

export function OpencodeComposer({
  onSubmit,
  draftKey,
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
  commands,
  onNewChat,
  actions,
}: OpencodeComposerProps) {
  const [restored] = useState(() =>
    draftKey ? readComposerDraft(draftKey) : undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forkDraft, setForkDraft] = useState(restored?.forkDraft);
  const [hasQuestion, setHasQuestion] = useState(Boolean(restored?.text));
  const [isFocused, setIsFocused] = useState(false);
  const [attachments, setAttachments] = useState<LocalAttachment[]>(() =>
    (restored?.files ?? []).map((file) => ({ id: crypto.randomUUID(), file })),
  );
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isVariantPickerOpen, setIsVariantPickerOpen] = useState(false);
  const [isAgentPickerOpen, setIsAgentPickerOpen] = useState(false);
  const [isProviderConnectOpen, setIsProviderConnectOpen] = useState(false);
  const [activeFileMention, setActiveFileMention] =
    useState<ActiveFileMention | null>(null);
  const [fileReferences, setFileReferences] = useState<OpencodeFileReference[]>(
    restored?.fileReferences ?? [],
  );
  const [fileSuggestions, setFileSuggestions] = useState<string[]>([]);
  const [isSearchingFiles, setIsSearchingFiles] = useState(false);
  const [highlightedFileIndex, setHighlightedFileIndex] = useState(0);
  const [activeSlashCommand, setActiveSlashCommand] =
    useState<ActiveFileMention | null>(null);
  const [highlightedCommandIndex, setHighlightedCommandIndex] = useState(0);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
  const attachmentsRef = useRef<LocalAttachment[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voice = useVoiceTranscription({
    getText: () => textareaRef.current?.value ?? "",
    onChangeText: (text) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.value = text;
      textarea.setSelectionRange(text.length, text.length);
      handleTextChange(textarea);
    },
    onDone: () =>
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          resizeTextarea(textarea);
          textarea.focus();
        }
      }),
  });
  const getVoiceDraftText = voice.getDraftText;
  const activeFileQuery = voice.isActive ? undefined : activeFileMention?.query;
  const isExpanded = (isFocused || hasQuestion) && !voice.isActive;
  const isSubmitDisabled =
    disabled ||
    voice.isActive ||
    isSubmitting ||
    submitDisabled ||
    (!hasQuestion &&
      attachments.length === 0 &&
      !forkDraft?.files.length &&
      !forkDraft?.attachments.length);
  const draftStateRef = useRef({
    attachments,
    fileReferences,
    forkDraft,
    selection,
  });
  useEffect(() => {
    draftStateRef.current = {
      attachments,
      fileReferences,
      forkDraft,
      selection,
    };
  }, [attachments, fileReferences, forkDraft, selection]);
  useEffect(() => {
    const textarea = textareaRef.current;
    return () => {
      if (!draftKey) return;
      const state = draftStateRef.current;
      saveComposerDraft(draftKey, {
        text: getVoiceDraftText() ?? textarea?.value ?? "",
        files: state.attachments.map((item) => item.file),
        fileReferences: state.fileReferences,
        forkDraft: state.forkDraft,
        selection: state.selection,
      });
    };
  }, [draftKey, getVoiceDraftText]);
  useEffect(() => {
    if (!restored || !textareaRef.current) return;
    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? "auto" : "hidden";
    textarea.focus();
  }, [restored]);
  const selectedModel = inventory?.models.find(
    (model) => model.id === selection.model,
  );
  const selectedAgent = inventory?.agents.find(
    (agent) => agent.id === selection.agent,
  );
  const hasModelPicker = !!(inventory?.models.length || providerConnection);
  const hasAgentPicker = !!inventory?.agents.length;
  const availableCommands = useMemo(() => {
    const serverCommands: ComposerCommand[] = commands ?? [];
    const localCommands: ComposerCommand[] = [
      ...(onNewChat
        ? [{ name: "new", description: "Start a new chat", run: onNewChat }]
        : []),
      ...(hasModelPicker
        ? [
            {
              name: "models",
              description: "Choose a model",
              run: () => setIsModelPickerOpen(true),
            },
          ]
        : []),
      ...(hasAgentPicker
        ? [
            {
              name: "agents",
              description: "Choose an agent",
              run: () => setIsAgentPickerOpen(true),
            },
          ]
        : []),
      ...(actions ?? []),
    ];
    return [
      ...serverCommands,
      ...localCommands.filter(
        (local) =>
          !serverCommands.some((command) => command.name === local.name),
      ),
    ];
  }, [actions, commands, hasAgentPicker, hasModelPicker, onNewChat]);
  const commandSuggestions = useMemo(
    () =>
      activeSlashCommand
        ? filterOpencodeCommands(availableCommands, activeSlashCommand.query)
        : [],
    [activeSlashCommand, availableCommands],
  );
  // Hidden when nothing matches, so a prompt like "/etc/hosts …" isn't nagged.
  const showCommandSuggestions =
    !voice.isActive && commandSuggestions.length > 0;

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
    if (!focusOnTyping || disabled || voice.isActive) return;

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
  }, [disabled, focusOnTyping, voice.isActive]);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled || voice.isBusy()) return;

    const trimmedQuestion = textareaRef.current?.value.trim() ?? "";
    setIsSubmitting(true);
    try {
      await onSubmit(
        trimmedQuestion,
        attachments.map((attachment) => attachment.file),
        fileReferences.filter((reference) =>
          trimmedQuestion.includes(reference.mention),
        ),
        forkDraft,
      );
      if (textareaRef.current) {
        textareaRef.current.value = "";
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.overflowY = "hidden";
      }
      draftStateRef.current = {
        attachments: [],
        fileReferences: [],
        forkDraft: undefined,
        selection,
      };
      setHasQuestion(false);
      setForkDraft(undefined);
      if (draftKey)
        saveComposerDraft(draftKey, {
          text: "",
          files: [],
          fileReferences: [],
          selection,
        });
      setActiveFileMention(null);
      setActiveSlashCommand(null);
      setFileReferences([]);
      attachments.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
      setAttachments([]);
      onSubmitSuccess?.();
    } catch {
      // The caller reports the error. Keep this draft and its attachments for retry.
    } finally {
      setIsSubmitting(false);
    }
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
    if (voice.isBusy()) {
      event.preventDefault();
      return;
    }
    if (event.nativeEvent.isComposing) return;
    if (showCommandSuggestions) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setHighlightedCommandIndex(
          (current) =>
            (current + direction + commandSuggestions.length) %
            commandSuggestions.length,
        );
        return;
      }
      if (
        (event.key === "Enter" || event.key === "Tab") &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();
        const command = commandSuggestions[highlightedCommandIndex];
        if (command) chooseCommand(command);
        return;
      }
    }
    if (event.key === "Escape" && activeSlashCommand) {
      setActiveSlashCommand(null);
      return;
    }
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

  const updateActiveTokens = (textarea: HTMLTextAreaElement) => {
    setActiveFileMention(
      getActiveFileMention(textarea.value, textarea.selectionStart),
    );
    const slashCommand = getActiveOpencodeSlashCommand(
      textarea.value,
      textarea.selectionStart,
    );
    if (slashCommand?.query !== activeSlashCommand?.query) {
      setHighlightedCommandIndex(0);
    }
    setActiveSlashCommand(slashCommand);
  };

  const handleTextChange = (textarea: HTMLTextAreaElement) => {
    setHasQuestion(textarea.value.trim().length > 0);
    updateActiveTokens(textarea);
    setFileReferences((current) => {
      const retained = current.filter((reference) =>
        textarea.value.includes(reference.mention),
      );
      return retained.length === current.length ? current : retained;
    });
    resizeTextarea(textarea);
  };

  const chooseCommand = (command: ComposerCommand) => {
    const textarea = textareaRef.current;
    if (!textarea || !activeSlashCommand) return;
    if (command.run) {
      // Local commands act on the composer instead of being sent.
      textarea.setRangeText(
        "",
        activeSlashCommand.start,
        activeSlashCommand.end,
        "start",
      );
      textarea.value = textarea.value.trimStart();
      setHasQuestion(textarea.value.trim().length > 0);
      setActiveSlashCommand(null);
      resizeTextarea(textarea);
      command.run();
      return;
    }
    textarea.setRangeText(
      `/${command.name} `,
      activeSlashCommand.start,
      activeSlashCommand.end,
      "end",
    );
    setHasQuestion(true);
    setActiveSlashCommand(null);
    resizeTextarea(textarea);
    textarea.focus();
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
      inert={isSubmitting}
      aria-busy={isSubmitting}
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
      {forkDraft && (
        <div className="flex flex-wrap gap-2 px-1">
          {forkDraft.files.map((file, index) => (
            <div
              key={`remote-${index}`}
              className="bg-muted flex max-w-full items-center gap-2 rounded-md border px-2 py-1 text-xs"
            >
              <File className="size-3.5 shrink-0" />
              <span className="truncate" title={file.name ?? file.source?.text}>
                {file.name || file.source?.text || "Attached file"}
              </span>
              <button
                type="button"
                aria-label={`Remove ${file.name || "attached file"}`}
                onClick={() =>
                  setForkDraft({
                    ...forkDraft,
                    files: forkDraft.files.filter((_, i) => i !== index),
                  })
                }
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {forkDraft.attachments.map((file, index) => (
            <div
              key={`uploaded-${index}`}
              className="bg-muted flex max-w-full items-center gap-2 rounded-md border px-2 py-1 text-xs"
            >
              <File className="size-3.5 shrink-0" />
              <span className="truncate" title={file.name}>
                {file.name}
              </span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() =>
                  setForkDraft({
                    ...forkDraft,
                    attachments: forkDraft.attachments.filter(
                      (_, i) => i !== index,
                    ),
                  })
                }
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {forkDraft.comments.length > 0 && (
            <div className="bg-muted flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
              {forkDraft.comments.length} context comments
              <button
                type="button"
                aria-label="Remove restored comments"
                onClick={() => setForkDraft({ ...forkDraft, comments: [] })}
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
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
                  <span
                    className="min-w-0 truncate"
                    title={attachment.file.name}
                  >
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
                className="h-10 max-w-64 shrink-0 justify-between gap-1.5 rounded-full px-3 text-xs font-normal"
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
                className="h-10 max-w-48 shrink-0 justify-between gap-1.5 rounded-full px-3 text-xs font-normal"
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
                title={selectedAgent?.name ?? selection.agent ?? "Choose agent"}
                className="h-10 max-w-56 shrink-0 justify-between gap-1.5 rounded-full px-3 text-xs font-normal"
              >
                <span className="truncate">
                  {selectedAgent?.name ?? selection.agent ?? "Choose agent"}
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
      {showCommandSuggestions ? (
        <div
          role="listbox"
          aria-label="Commands"
          className="bg-popover text-popover-foreground max-h-64 overflow-y-auto rounded-xl border p-1 shadow-lg"
        >
          {commandSuggestions.map((command, index) => (
            <button
              key={command.name}
              type="button"
              role="option"
              aria-selected={index === highlightedCommandIndex}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                index === highlightedCommandIndex
                  ? "bg-accent"
                  : "hover:bg-accent"
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseCommand(command)}
            >
              <SquareSlash className="text-muted-foreground size-4 shrink-0" />
              <span className="shrink-0 font-mono text-xs">
                /{command.name}
              </span>
              {command.description ? (
                <span className="text-muted-foreground min-w-0 truncate text-xs">
                  {command.description}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : !voice.isActive && activeFileMention && searchFiles ? (
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
                <span className="min-w-0 truncate text-left font-mono text-xs [direction:rtl]">
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
      <div
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setIsFocused(false);
        }}
        className={`bg-card focus-within:border-foreground/30 flex min-h-14 min-w-0 border p-1.5 transition-colors motion-reduce:transition-none ${isExpanded ? "flex-wrap rounded-3xl" : "items-center rounded-full"}`}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={
            !voice.isActive &&
            (disabled || attachments.length >= MAX_ATTACHMENTS)
          }
          className={`size-11 shrink-0 rounded-full ${isExpanded ? "order-2" : "order-0"}`}
          aria-label={
            voice.isActive ? "Cancel voice typing" : "Add an attachment"
          }
          title={voice.isActive ? "Cancel voice typing" : "Add an attachment"}
          onClick={() =>
            voice.isActive ? voice.cancel() : fileInputRef.current?.click()
          }
        >
          {voice.isActive ? (
            <X className="size-5" />
          ) : (
            <Plus className="size-5" />
          )}
        </Button>
        <textarea
          ref={textareaRef}
          defaultValue={restored?.text}
          rows={1}
          aria-label="Write an AI message"
          placeholder="Work on anything"
          disabled={disabled || voice.isActive}
          onFocus={() => setIsFocused(true)}
          onChange={(event) => handleTextChange(event.target)}
          onClick={(event) => updateActiveTokens(event.currentTarget)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={`placeholder:text-muted-foreground caret-foreground selection:bg-primary/20 min-h-11 min-w-0 resize-none overflow-y-hidden border-0 bg-transparent px-3 py-2.5 text-base leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-60 ${voice.isActive ? "hidden" : isExpanded ? "order-1 w-full" : "order-1 flex-1"}`}
        />
        {voice.isActive ? (
          <div className="order-1 flex min-w-0 flex-1 items-center gap-2 px-2">
            {voice.state === "recording" ? (
              <>
                <VoiceWaveform meterRef={voice.meterRef} />
                <span
                  aria-label={`${voice.durationSeconds} seconds recorded`}
                  className="text-muted-foreground shrink-0 text-xs tabular-nums"
                >
                  {Math.floor(voice.durationSeconds / 60)}:
                  {String(voice.durationSeconds % 60).padStart(2, "0")}
                </span>
              </>
            ) : (
              <span
                role="status"
                className="text-muted-foreground min-w-0 truncate text-sm"
              >
                {voice.state === "starting"
                  ? "Starting microphone…"
                  : voice.state === "error"
                    ? "Could not transcribe. Retry or discard."
                    : "Transcribing…"}
              </span>
            )}
          </div>
        ) : null}
        <div
          className={`flex shrink-0 items-center gap-0.5 ${isExpanded ? "order-3 ml-auto" : "order-2"}`}
        >
          {voice.isActive ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 rounded-full border border-red-600/35 bg-red-600/10 text-red-600 hover:bg-red-600/20 dark:text-red-400"
              disabled={voice.state !== "recording" && voice.state !== "error"}
              aria-label={
                voice.state === "error"
                  ? "Retry transcription"
                  : "Stop recording"
              }
              title={
                voice.state === "error"
                  ? "Retry transcription"
                  : "Stop recording"
              }
              onClick={() =>
                voice.state === "error" ? voice.retry() : void voice.stop()
              }
            >
              {voice.state === "error" ? (
                <RotateCcw className="size-5" />
              ) : voice.state === "recording" ? (
                <Square className="size-4 fill-current" />
              ) : (
                <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
              )}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground size-11 shrink-0 rounded-full"
                disabled={disabled || isSubmitting}
                aria-label="Start voice typing"
                title="Start voice typing"
                onClick={() => void voice.start()}
              >
                <Mic className="size-5" />
              </Button>
              {isStreaming ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 rounded-full"
                    aria-label="Stop response"
                    title="Stop response"
                    disabled={isStopping}
                    onClick={onStop}
                  >
                    <Square className="size-4 fill-current" />
                  </Button>
                  {queueWhenStreaming ? (
                    <Button
                      type="submit"
                      size="icon"
                      className="size-11 shrink-0 rounded-full"
                      disabled={isSubmitDisabled}
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
                  className="size-11 shrink-0 rounded-full"
                  disabled={isSubmitDisabled}
                  aria-label="Send message"
                  title="Send message"
                >
                  <ArrowUp className="size-5" strokeWidth={2.5} />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </form>
  );
}
