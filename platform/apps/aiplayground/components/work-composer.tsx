"use client";

import { useProjectsStore } from "@/store/playground-store";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { ArrowUp, FolderKanban, Loader2 } from "lucide-react";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";

type ProjectMention = {
  start: number;
  end: number;
  query: string;
};

type HighlightedMessagePart = {
  text: string;
  tagIndex: number | null;
};

export type WorkComposerTag = {
  type: "project";
  data: {
    id: string;
    name: string;
  };
};

export type WorkComposerSubmitPayload = {
  message: string;
  tagged: WorkComposerTag[];
};

type WorkComposerProps = {
  onSubmit?: (payload: WorkComposerSubmitPayload) => boolean | void;
  disabled?: boolean;
  isSubmitting?: boolean;
  placeholder?: string;
  showHeading?: boolean;
  variant?: "default" | "compact";
};

function getProjectMention(message: string, cursor: number) {
  const textBeforeCursor = message.slice(0, cursor);
  const match = textBeforeCursor.match(/(?:^|[\s([{])@([^\s@\n]*)$/);

  if (!match) return null;

  const query = match[1] ?? "";

  return {
    start: cursor - query.length - 1,
    end: cursor,
    query,
  } satisfies ProjectMention;
}

function getHighlightedMessageParts(
  message: string,
  tagged: WorkComposerTag[],
) {
  if (!message) return [];

  const projectMentions = tagged
    .map((tag, tagIndex) => ({
      text: `@${tag.data.name}`,
      tagIndex,
    }))
    .sort((left, right) => right.text.length - left.text.length);
  const normalizedMessage = message.toLocaleLowerCase();
  const parts: HighlightedMessagePart[] = [];
  let plainTextStart = 0;
  let index = 0;

  while (index < message.length) {
    const hasStartBoundary =
      index === 0 || /[\s([{]/.test(message[index - 1] ?? "");

    if (!hasStartBoundary || message[index] !== "@") {
      index += 1;
      continue;
    }

    const projectMention = projectMentions.find((mention) => {
      const mentionEnd = index + mention.text.length;
      const hasEndBoundary =
        mentionEnd === message.length ||
        /[\s.,!?;:)\]}]/.test(message[mentionEnd] ?? "");

      return (
        hasEndBoundary &&
        normalizedMessage.startsWith(mention.text.toLocaleLowerCase(), index)
      );
    });

    if (!projectMention) {
      index += 1;
      continue;
    }

    if (plainTextStart < index) {
      parts.push({
        text: message.slice(plainTextStart, index),
        tagIndex: null,
      });
    }

    const mentionEnd = index + projectMention.text.length;
    parts.push({
      text: message.slice(index, mentionEnd),
      tagIndex: projectMention.tagIndex,
    });
    index = mentionEnd;
    plainTextStart = mentionEnd;
  }

  if (plainTextStart < message.length) {
    parts.push({
      text: message.slice(plainTextStart),
      tagIndex: null,
    });
  }

  return parts;
}

function serializeTaggedMessage(message: string, tagged: WorkComposerTag[]) {
  return getHighlightedMessageParts(message, tagged)
    .map((part) =>
      part.tagIndex === null ? part.text : `@{{${part.tagIndex + 1}}}`,
    )
    .join("");
}

function hasProjectMention(message: string, projectName: string) {
  const normalizedMessage = message.toLocaleLowerCase();
  const normalizedMention = `@${projectName}`.toLocaleLowerCase();
  let index = normalizedMessage.indexOf(normalizedMention);

  while (index !== -1) {
    const mentionEnd = index + normalizedMention.length;
    const hasStartBoundary =
      index === 0 || /[\s([{]/.test(message[index - 1] ?? "");
    const hasEndBoundary =
      mentionEnd === message.length ||
      /[\s.,!?;:)\]}]/.test(message[mentionEnd] ?? "");

    if (hasStartBoundary && hasEndBoundary) return true;

    index = normalizedMessage.indexOf(normalizedMention, index + 1);
  }

  return false;
}

export function WorkComposer({
  onSubmit,
  disabled = false,
  isSubmitting = false,
  placeholder = "type @ to tag a project",
  showHeading = true,
  variant = "default",
}: WorkComposerProps) {
  const projects = useProjectsStore((store) => store.projects);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightedMessageRef = useRef<HTMLDivElement>(null);
  const projectListId = useId();
  const [message, setMessage] = useState("");
  const [projectMention, setProjectMention] = useState<ProjectMention | null>(
    null,
  );
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [tagged, setTagged] = useState<WorkComposerTag[]>([]);

  const matchingProjects = useMemo(() => {
    if (!projectMention) return [];

    const query = projectMention.query.trim().toLocaleLowerCase();

    return projects
      .filter((project) => project.name.toLocaleLowerCase().includes(query))
      .slice(0, 8);
  }, [projectMention, projects]);
  const activeProject =
    matchingProjects[activeProjectIndex] ?? matchingProjects[0];
  const highlightedMessageParts = useMemo(
    () => getHighlightedMessageParts(message, tagged),
    [message, tagged],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || isSubmitting || !message.trim() || !onSubmit) return;

    const submitted = onSubmit({
      message: serializeTaggedMessage(message.trim(), tagged),
      tagged,
    });

    if (submitted === false) return;

    setMessage("");
    setTagged([]);
    setProjectMention(null);
    setActiveProjectIndex(0);
    if (highlightedMessageRef.current) {
      highlightedMessageRef.current.style.transform = "";
    }
  };

  const updateProjectMention = (value: string, cursor: number) => {
    setProjectMention(getProjectMention(value, cursor));
    setActiveProjectIndex(0);
  };

  const handleMessageChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.currentTarget.value;

    setMessage(value);
    setTagged((current) =>
      current.filter((tag) => hasProjectMention(value, tag.data.name)),
    );
    updateProjectMention(value, event.currentTarget.selectionStart);
  };

  const handleTextSelection = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    updateProjectMention(
      event.currentTarget.value,
      event.currentTarget.selectionStart,
    );
  };

  const insertProjectMention = (project: (typeof projects)[number]) => {
    if (!projectMention) return;

    const mention = `@${project.name}`;
    const textAfterMention = message.slice(projectMention.end);
    const separator = /^\s/.test(textAfterMention) ? "" : " ";
    const nextMessage = `${message.slice(0, projectMention.start)}${mention}${separator}${textAfterMention}`;
    const nextCursor = projectMention.start + mention.length + separator.length;

    setMessage(nextMessage);
    setTagged((current) => {
      const nextTag: WorkComposerTag = {
        type: "project",
        data: {
          id: project.id,
          name: project.name,
        },
      };
      const existingIndex = current.findIndex(
        (tag) =>
          tag.data.id === project.id ||
          tag.data.name.toLocaleLowerCase() ===
            project.name.toLocaleLowerCase(),
      );

      if (existingIndex === -1) return [...current, nextTag];

      return current.map((tag, index) =>
        index === existingIndex ? nextTag : tag,
      );
    });
    setProjectMention(null);
    setActiveProjectIndex(0);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (projectMention) {
      if (event.key === "Escape") {
        event.preventDefault();
        setProjectMention(null);
        return;
      }

      if (matchingProjects.length > 0 && event.key === "ArrowDown") {
        event.preventDefault();
        setActiveProjectIndex(
          (current) => (current + 1) % matchingProjects.length,
        );
        return;
      }

      if (matchingProjects.length > 0 && event.key === "ArrowUp") {
        event.preventDefault();
        setActiveProjectIndex(
          (current) =>
            (current - 1 + matchingProjects.length) % matchingProjects.length,
        );
        return;
      }

      if (
        activeProject &&
        (event.key === "Tab" ||
          (event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing))
      ) {
        event.preventDefault();
        insertProjectMention(activeProject);
        return;
      }
    }

    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  return (
    <section
      className="w-full"
      aria-labelledby={showHeading ? "work-heading" : undefined}
      aria-label={showHeading ? undefined : "Chat composer"}
    >
      {showHeading ? (
        <h1
          id="work-heading"
          className="mb-8 text-center text-3xl font-medium tracking-tight sm:text-4xl"
        >
          What&apos;s in your mind?
        </h1>
      ) : null}

      <form ref={formRef} onSubmit={handleSubmit} className="relative">
        <div className="bg-card focus-within:border-foreground/20 relative z-10 overflow-hidden rounded-[28px] border shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-colors">
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <div
                ref={highlightedMessageRef}
                className={cn(
                  "text-foreground w-full break-words whitespace-pre-wrap",
                  variant === "compact"
                    ? "min-h-16 px-4 pt-3 pb-2 text-sm leading-6"
                    : "min-h-32 px-6 pt-6 pb-3 text-base leading-normal sm:min-h-36 sm:text-lg",
                )}
              >
                {highlightedMessageParts.map((part, index) => (
                  <span
                    key={`${part.text}-${index}`}
                    className={
                      part.tagIndex !== null
                        ? "font-medium text-blue-600 dark:text-blue-400"
                        : undefined
                    }
                  >
                    {part.text}
                  </span>
                ))}
                {message.endsWith("\n") ? "\u00a0" : null}
              </div>
            </div>

            <textarea
              ref={textareaRef}
              aria-label="Write an AI message"
              aria-autocomplete="list"
              aria-controls={projectMention ? projectListId : undefined}
              aria-expanded={projectMention !== null}
              aria-activedescendant={
                projectMention && activeProject
                  ? `${projectListId}-${activeProject.id}`
                  : undefined
              }
              placeholder={placeholder}
              value={message}
              disabled={disabled}
              onChange={handleMessageChange}
              onSelect={handleTextSelection}
              onScroll={(event) => {
                if (!highlightedMessageRef.current) return;

                highlightedMessageRef.current.style.transform = `translate(${-event.currentTarget.scrollLeft}px, ${-event.currentTarget.scrollTop}px)`;
              }}
              onBlur={() => setProjectMention(null)}
              onKeyDown={handleKeyDown}
              className={cn(
                "placeholder:text-muted-foreground caret-foreground selection:bg-primary/25 relative w-full resize-none border-0 bg-transparent text-transparent outline-none disabled:cursor-not-allowed disabled:opacity-60",
                variant === "compact"
                  ? "max-h-40 min-h-16 px-4 pt-3 pb-2 text-sm leading-6"
                  : "min-h-32 px-6 pt-6 pb-3 text-base leading-normal sm:min-h-36 sm:text-lg",
              )}
            />
          </div>

          <div className="flex items-center justify-end px-4 pb-3">
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || disabled || isSubmitting}
              className={cn(
                "rounded-full",
                variant === "compact" ? "size-10" : "size-12",
              )}
              aria-label="Submit message"
            >
              {isSubmitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ArrowUp className="size-6" strokeWidth={2.5} />
              )}
            </Button>
          </div>
        </div>

        {projectMention ? (
          <div
            id={projectListId}
            role="listbox"
            aria-label="Projects"
            className={cn(
              "bg-popover text-popover-foreground absolute right-3 left-3 z-20 max-h-64 overflow-y-auto rounded-xl border p-1.5 shadow-lg",
              variant === "compact" ? "bottom-full mb-2" : "top-full mt-2",
            )}
          >
            {matchingProjects.length > 0 ? (
              matchingProjects.map((project, index) => (
                <button
                  key={project.id}
                  id={`${projectListId}-${project.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeProjectIndex}
                  className="hover:bg-muted aria-selected:bg-muted flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm outline-none"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveProjectIndex(index)}
                  onClick={() => insertProjectMention(project)}
                >
                  <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
                    <FolderKanban className="size-4" />
                  </span>
                  <span className="min-w-0 truncate font-medium">
                    @{project.name}
                  </span>
                </button>
              ))
            ) : (
              <p className="text-muted-foreground px-3 py-4 text-center text-sm">
                {projects.length === 0
                  ? "No projects yet. Create a project to tag it here."
                  : `No projects match “${projectMention.query.trim()}”.`}
              </p>
            )}
          </div>
        ) : null}
      </form>
      {variant === "compact" ? (
        <p className="text-muted-foreground mt-1.5 text-center text-[11px]">
          Enter to send · Shift+Enter for a new line · Type @ to tag a project
        </p>
      ) : null}
    </section>
  );
}
