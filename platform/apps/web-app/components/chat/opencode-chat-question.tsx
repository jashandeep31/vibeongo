"use client";

import MarkdownRenderer from "@/components/markdown-renderer";
import { OpencodeFileDiff } from "@/components/chat/opencode-file-diff";
import { OpencodeToolCall } from "@/components/chat/opencode-tool-call";
import {
  groupConsecutiveOpencodeToolContent,
  type OpencodeChatContent,
  type SnapshotFileDiff,
  type ToolPart,
} from "@repo/api-client";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import {
  Check,
  CircleAlert,
  Copy,
  Loader2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Blocks } from "loading-dev";

export type OpencodeChatTurn = {
  id: string;
  question: string;
  files: Array<{ id: string; path: string }>;
  images: Array<{ id: string; url: string; name: string }>;
  summaryDiffs: SnapshotFileDiff[];
  content: OpencodeChatContent[];
  agent?: string;
  model?: string;
  durationMs?: number;
};

export function OpencodeChatQuestion({
  item,
  isStreaming = false,
  reserveBottomSpace = false,
  isReverting = false,
  revertDisabled = false,
  onRevert,
}: {
  item: OpencodeChatTurn;
  isStreaming?: boolean;
  reserveBottomSpace?: boolean;
  isReverting?: boolean;
  revertDisabled?: boolean;
  onRevert: () => void;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [isQuestionCopied, setIsQuestionCopied] = useState(false);
  const [reserveSpace, setReserveSpace] = useState(false);
  useEffect(() => {
    setReserveSpace(reserveBottomSpace);
  }, [reserveBottomSpace]);
  const answer = item.content
    .flatMap((content) => (content.type === "text" ? [content.text] : []))
    .join("\n\n")
    .trim();
  const content = groupConsecutiveOpencodeToolContent(item.content);
  const firstEditGroupId = content.find(
    (content) =>
      content.type === "tools" &&
      content.tools.every((tool) => isEditTool(tool)),
  )?.id;

  return (
    <div
      className="flex flex-col gap-8 transition-[min-height] duration-[280ms] ease-out"
      style={{ minHeight: reserveSpace ? "70dvh" : "0dvh" }}
    >
      {item.question || item.images.length > 0 ? (
        <div className="group/question flex flex-col items-end gap-2">
          <div className="bg-muted text-foreground border-border max-w-[90%] space-y-2 rounded-2xl border p-2 text-base leading-relaxed break-all shadow-sm md:max-w-[55%]">
            {item.images.length > 0 ? (
              <div className="flex flex-wrap justify-end gap-2">
                {item.images.map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={image.id}
                    src={image.url}
                    alt={image.name}
                    className="max-h-72 max-w-full rounded-xl object-contain"
                  />
                ))}
              </div>
            ) : null}
            {item.question ? <div className="px-1">{item.question}</div> : null}
          </div>
          <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover/question:opacity-100 md:focus-within:opacity-100">
            {item.question ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
                aria-label="Copy question"
                title="Copy question"
                onClick={() => {
                  void navigator.clipboard.writeText(item.question);
                  setIsQuestionCopied(true);
                  window.setTimeout(() => setIsQuestionCopied(false), 1500);
                }}
              >
                {isQuestionCopied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            ) : null}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors disabled:pointer-events-none disabled:opacity-40"
              aria-label="Revert from this question"
              title="Revert this question and everything after it"
              disabled={revertDisabled || isReverting}
              onClick={onRevert}
            >
              {isReverting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Undo2 className="size-3.5" />
              )}
            </button>
          </div>
        </div>
      ) : null}

      <div className="group/response">
        {item.content.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-2">
              {content.map((content) =>
                content.type === "text" ? (
                  <MarkdownRenderer key={content.id} content={content.text} />
                ) : content.type === "reasoning" ? (
                  <details
                    key={content.id}
                    className="group/reasoning text-sm"
                  >
                    <summary className="text-muted-foreground flex cursor-pointer list-none items-center gap-2 py-1 [&::-webkit-details-marker]:hidden">
                      {content.active ? (
                        <Blocks duration={1570} size={10} />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      <span>{getReasoningHeading(content.text)}</span>
                      {content.durationMs !== undefined ? (
                        <span className="text-xs">
                          {formatDuration(content.durationMs)}
                        </span>
                      ) : null}
                    </summary>
                    <div className="border-border/60 ml-1 border-l py-2 pl-4 opacity-80">
                      <MarkdownRenderer content={content.text} />
                    </div>
                  </details>
                ) : content.type === "notice" ? (
                  <div
                    key={content.id}
                    className="text-muted-foreground py-1 text-sm"
                    role="status"
                  >
                    {content.text}
                  </div>
                ) : content.type === "interruption" ? (
                  <div
                    key={content.id}
                    className="text-muted-foreground flex items-center gap-3 py-2 text-xs"
                    role="status"
                  >
                    <span className="bg-border h-px flex-1" />
                    <span>{content.text}</span>
                    <span className="bg-border h-px flex-1" />
                  </div>
                ) : content.type === "tools" ? (
                  <OpencodeToolCall
                    key={content.id}
                    tools={content.tools}
                    summaryDiffs={
                      content.id === firstEditGroupId
                        ? item.summaryDiffs
                        : undefined
                    }
                  />
                ) : content.type === "error" ? (
                  <Alert
                    key={content.id}
                    variant="destructive"
                    className="my-2 py-3"
                  >
                    <CircleAlert />
                    <AlertTitle>
                      {content.title}
                      {content.statusCode ? ` (${content.statusCode})` : ""}
                    </AlertTitle>
                    <AlertDescription className="break-words whitespace-pre-wrap">
                      {content.message}
                    </AlertDescription>
                  </Alert>
                ) : content.type === "retry" ? (
                  <Alert key={content.id} className="my-2 py-3" role="status">
                    <Loader2 className="animate-spin" />
                    <AlertTitle>
                      Retrying request (attempt {content.attempt})
                    </AlertTitle>
                    <AlertDescription className="break-words whitespace-pre-wrap">
                      {content.message}
                    </AlertDescription>
                  </Alert>
                ) : isStreaming && content.active ? (
                  <div
                    key={content.id}
                    className="text-muted-foreground animate-pulse py-1 text-sm"
                  >
                    Thinking…
                  </div>
                ) : null,
              )}
              {!firstEditGroupId
                ? item.summaryDiffs.map((diff, index) => (
                    <OpencodeFileDiff
                      key={`${diff.file ?? "summary-diff"}-${index}`}
                      diff={diff}
                      defaultOpen={index === 0}
                    />
                  ))
                : null}
            </div>
            {answer && !isStreaming ? (
              <div className="text-muted-foreground mt-4 flex items-center gap-2 text-xs opacity-100 transition-opacity md:opacity-0 md:group-hover/response:opacity-100 md:focus-within:opacity-100">
                <button
                  type="button"
                  aria-label="Copy response"
                  onClick={() => {
                    void navigator.clipboard.writeText(answer);
                    setIsCopied(true);
                    window.setTimeout(() => setIsCopied(false), 1500);
                  }}
                >
                  {isCopied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
                {[item.agent, item.model, formatDuration(item.durationMs)]
                  .filter(Boolean)
                  .map((value, index) => (
                    <span key={`${value}-${index}`}>
                      {index > 0 ? "· " : ""}
                      {value}
                    </span>
                  ))}
              </div>
            ) : null}
            {isStreaming ? <StreamingIndicator /> : null}
          </>
        ) : isStreaming ? (
          <StreamingIndicator />
        ) : null}
      </div>
    </div>
  );
}

function getReasoningHeading(text: string) {
  const heading = text.match(/^\s{0,3}#{1,6}[ \t]+(.+?)\s*$/m)?.[1];
  const strong = text.match(/^\s*(?:\*\*|__)(.+?)(?:\*\*|__)\s*$/m)?.[1];
  const value = (heading ?? strong ?? "Thought").replace(/[*_~`]+/g, "").trim();
  return value.length > 72 ? `${value.slice(0, 69)}…` : value;
}

export function StreamingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Vibeongo is working"
      className="group/working text-muted-foreground mt-4 flex w-fit cursor-help items-center gap-2 text-sm"
      title="Credit eater. It's me, OpenCode."
    >
      <Blocks duration={1570} size={10} />
      <span className="grid overflow-hidden">
        <span className="col-start-1 row-start-1 transition-all duration-200 group-hover/working:translate-y-1 group-hover/working:opacity-0">
          Vibeongo is working…
        </span>
        <span className="text-primary col-start-1 row-start-1 -translate-y-1 font-mono text-xs opacity-0 transition-all duration-200 group-hover/working:translate-y-0 group-hover/working:opacity-100">
          Credit eater. It&apos;s me, OpenCode.
        </span>
      </span>
    </div>
  );
}

function isEditTool(tool: ToolPart) {
  return ["edit", "write", "patch", "apply_patch"].includes(tool.tool);
}

function formatDuration(durationMs?: number) {
  if (durationMs === undefined) return undefined;
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${Math.round(durationMs / 1000)}s`;
}
