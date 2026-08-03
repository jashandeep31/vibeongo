"use client";

import MarkdownRenderer from "@/components/markdown-renderer";
import { OpencodeToolCall } from "@/components/chat/opencode-tool-call";
import type { ToolPart } from "@opencode-ai/sdk/v2/client";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export type OpencodeChatTurn = {
  id: string;
  question: string;
  images: Array<{ id: string; url: string; name: string }>;
  content: Array<
    | { id: string; type: "text"; text: string }
    | { id: string; type: "tools"; tools: ToolPart[] }
    | { id: string; type: "thinking"; active: boolean }
  >;
  agent?: string;
  model?: string;
  durationMs?: number;
};

const LoadingResponseSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-4 w-full max-w-2xl" />
    <Skeleton className="h-4 w-full max-w-xl" />
    <Skeleton className="h-4 w-full max-w-lg" />
  </div>
);

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
  const answer = item.content
    .flatMap((content) => (content.type === "text" ? [content.text] : []))
    .join("\n\n")
    .trim();

  return (
    <div
      className={cn(
        "flex flex-col gap-8",
        reserveBottomSpace && "min-h-[42dvh] md:min-h-[60dvh]",
      )}
    >
      {item.question || item.images.length > 0 ? (
        <div className="flex justify-end">
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
                  <OpencodeToolCall key={content.id} tools={content.tools} />
                ) : isStreaming && content.active ? (
                  <div
                    key={content.id}
                    className="text-muted-foreground animate-pulse py-1 text-sm"
                  >
                    Thinking…
                  </div>
                ) : null,
              )}
            </div>
            {answer ? (
              <div className="text-muted-foreground mt-4 flex items-center gap-2 text-xs opacity-0 transition-opacity group-hover/response:opacity-100 focus-within:opacity-100">
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
          <LoadingResponseSkeleton />
        ) : null}
      </div>
    </div>
  );
}

function formatDuration(durationMs?: number) {
  if (durationMs === undefined) return undefined;
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${Math.round(durationMs / 1000)}s`;
}
