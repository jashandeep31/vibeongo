"use client";

import MarkdownRenderer from "@/components/markdown-renderer";
import { OpencodeFileDiff } from "@/components/chat/opencode-file-diff";
import { OpencodeToolCall } from "@/components/chat/opencode-tool-call";
import type { SnapshotFileDiff, ToolPart } from "@opencode-ai/sdk/v2/client";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { cn } from "@repo/ui/lib/utils";
import { Check, CircleAlert, Copy } from "lucide-react";
import { useState } from "react";

export type OpencodeChatTurn = {
  id: string;
  question: string;
  images: Array<{ id: string; url: string; name: string }>;
  summaryDiffs: SnapshotFileDiff[];
  content: Array<
    | { id: string; type: "text"; text: string }
    | { id: string; type: "tools"; tools: ToolPart[] }
    | { id: string; type: "thinking"; active: boolean }
    | {
        id: string;
        type: "error";
        title: string;
        message: string;
        statusCode?: number;
      }
  >;
  agent?: string;
  model?: string;
  durationMs?: number;
};

export function OpencodeChatQuestion({
  item,
  isStreaming = false,
  reserveBottomSpace = false,
}: {
  item: OpencodeChatTurn;
  isStreaming?: boolean;
  reserveBottomSpace?: boolean;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [isQuestionCopied, setIsQuestionCopied] = useState(false);
  const answer = item.content
    .flatMap((content) => (content.type === "text" ? [content.text] : []))
    .join("\n\n")
    .trim();
  const firstEditGroupId = item.content.find(
    (content) =>
      content.type === "tools" &&
      content.tools.every((tool) => isEditTool(tool)),
  )?.id;

  return (
    <div
      className={cn(
        "flex flex-col gap-8",
        reserveBottomSpace && "min-h-[42dvh] md:min-h-[60dvh]",
      )}
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
          {item.question ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded-md p-1 opacity-100 transition md:opacity-0 md:group-hover/question:opacity-100 md:focus-visible:opacity-100"
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
        </div>
      ) : null}

      <div className="group/response">
        {item.content.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-2">
              {item.content.map((content) =>
                content.type === "text" ? (
                  <MarkdownRenderer key={content.id} content={content.text} />
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
            {answer ? (
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
          </>
        ) : isStreaming ? (
          <div className="text-muted-foreground animate-pulse py-1 text-sm">
            Thinking…
          </div>
        ) : null}
      </div>
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
