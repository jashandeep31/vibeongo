"use client";

import MarkdownRenderer from "@/components/markdown-renderer";
import type { IChatQuestion } from "@/store/chat-store";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ChatQuestionProps {
  item: IChatQuestion;
}

export function ChatQuestion({ item }: ChatQuestionProps) {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  const answer = item.answer;
  const reasoning = answer?.reasoning?.trim();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <div className="bg-muted text-foreground border-border max-w-[70%] rounded-2xl border px-5 py-4 text-base leading-relaxed shadow-sm md:max-w-[55%]">
          {item.question}
        </div>
      </div>

      <div className="max-w-3xl">
        {reasoning ? (
          <div className="mb-4">
            <div
              className={
                isReasoningExpanded
                  ? "bg-muted/70 text-muted-foreground rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap"
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
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/75 to-transparent" />
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
        {answer?.answer ? <MarkdownRenderer content={answer.answer} /> : null}
      </div>
    </div>
  );
}
