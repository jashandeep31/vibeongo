"use client";

import { NewChatInput } from "@/components/chat/new-chat-input";
import { useVibeSocket } from "@/hooks/use-vibe-socket";

export default function ClientView() {
  useVibeSocket();

  return (
    <div className="bg-background flex min-h-0 w-full flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto flex min-h-full w-full max-w-4xl items-center justify-center text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Setup new Project with{" "}
            <span className="animate-shimmer bg-[linear-gradient(110deg,#9ca3af,45%,#f3f4f6,55%,#9ca3af)] bg-[length:200%_100%] bg-clip-text text-transparent dark:bg-[linear-gradient(110deg,#6b7280,45%,#ffffff,55%,#6b7280)]">
              AI.
            </span>
          </h1>
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4 md:px-8 md:pb-6">
        <div className="mx-auto w-full max-w-4xl">
          <NewChatInput />
        </div>
      </div>
    </div>
  );
}
