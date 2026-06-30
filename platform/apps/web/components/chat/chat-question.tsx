"use client";

import MarkdownRenderer from "@/components/markdown-renderer";
import type { IChatQuestion } from "@/store/chat-store";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ChatQuestionProps {
  item: IChatQuestion;
  isStreaming?: boolean;
  reserveBottomSpace?: boolean;
}

const LoadingResponseSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-4 w-full max-w-2xl" />
    <Skeleton className="h-4 w-full max-w-xl" />
    <Skeleton className="h-4 w-full max-w-lg" />
    <Skeleton className="h-4 w-full max-w-2xl" />
    <Skeleton className="h-4 w-full max-w-xl" />
    <Skeleton className="h-4 w-full max-w-lg" />
    <Skeleton className="h-4 w-full max-w-2xl" />
    <Skeleton className="h-4 w-full max-w-xl" />
    <Skeleton className="h-4 w-full max-w-lg" />
  </div>
);

export function ChatQuestion({
  item,
  isStreaming = false,
  reserveBottomSpace = false,
}: ChatQuestionProps) {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  const answer = item.answer;
  const reasoning = answer?.reasoning?.trim();
  const hasAnswer = Boolean(answer?.answer?.trim());
  const hasResponseText = hasAnswer || Boolean(reasoning);

  return (
    <div
      className={cn(
        "flex flex-col gap-8",
        reserveBottomSpace && "min-h-[42dvh] md:min-h-[60dvh]",
      )}
    >
      <div className="flex justify-end">
        <div className="bg-muted text-foreground border-border max-w-[90%] rounded-2xl border px-3 py-2 text-base leading-relaxed break-all shadow-sm md:max-w-[55%]">
          {item.question}
        </div>
      </div>

      <div className="">
        {reasoning ? (
          <div className="mb-4 max-w-[75%]">
            <div
              className={
                isReasoningExpanded
                  ? "bg-muted/70 text-muted-foreground rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm"
                  : "bg-muted/70 text-muted-foreground relative h-32 overflow-hidden rounded-lg text-sm leading-relaxed shadow-sm"
              }
            >
              {isReasoningExpanded ? (
                reasoning
              ) : (
                <>
                  <div className="absolute inset-x-0 bottom-0 px-4 py-3 whitespace-pre-wrap">
                    {reasoning}
                  </div>
                  <div className="from-muted pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b to-transparent" />
                </>
              )}
            </div>
            <button
              type="button"
              aria-expanded={isReasoningExpanded}
              onClick={() => setIsReasoningExpanded((expanded) => !expanded)}
              className="text-muted-foreground hover:text-foreground mt-2 inline-flex items-center gap-1 text-xs font-medium transition-colors"
            >
              {isReasoningExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Collapse reasoning
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Expand reasoning
                </>
              )}
            </button>
          </div>
        ) : null}
        {hasAnswer ? (
          <div className="grid grid-cols-1">
            <MarkdownRenderer content={answer?.answer ?? ""} />
          </div>
        ) : isStreaming && !hasResponseText ? (
          <LoadingResponseSkeleton />
        ) : null}
      </div>
    </div>
  );
}
