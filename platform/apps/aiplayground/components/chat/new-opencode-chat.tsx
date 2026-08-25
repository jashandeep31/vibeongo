"use client";

import { PromptInput } from "@/components/chat/prompt-input";
import { useOpencodeInventory } from "@repo/api-hooks";
import { useStartOpencodeSession } from "@repo/api-hooks";
import type { OpencodePromptSelection } from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import { ChevronRight, Terminal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewOpencodeChat({
  chatId,
  chatUrl,
  serverUrl,
  accessToken,
  password,
  directory,
  projectName,
  sessionName,
}: {
  chatId: string;
  chatUrl: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
  directory?: string;
  projectName: string;
  sessionName: string;
}) {
  const router = useRouter();
  const startSession = useStartOpencodeSession();
  const { data: inventory } = useOpencodeInventory(
    chatId,
    serverUrl,
    accessToken,
    password,
  );
  const [selection, setSelection] = useState<OpencodePromptSelection>({});
  const effectiveSelection: OpencodePromptSelection = {
    model: selection.model ?? inventory?.models[0]?.id,
    variant: selection.variant,
    agent:
      selection.agent ??
      inventory?.agents.find((agent) => agent.mode === "primary")?.id ??
      inventory?.agents[0]?.id,
  };

  const handleSubmit = (text: string, files: File[]) => {
    startSession.mutate({
      chatId,
      serverUrl,
      accessToken,
      password,
      directory,
      text,
      files,
      selection: effectiveSelection,
      onSessionCreated: (sessionId) => {
        const params = new URLSearchParams({ serverUrl });
        router.replace(
          `${chatUrl}/sessions/${encodeURIComponent(sessionId)}?${params.toString()}`,
        );
      },
    });
  };

  return (
    <div className="flex min-w-0 flex-1 items-end justify-center overflow-hidden px-4 pt-6 pb-4 md:px-0">
      <section
        className="w-full max-w-4xl min-w-0"
        aria-labelledby="new-chat-heading"
      >
        <h1
          id="new-chat-heading"
          className="mb-8 flex w-full max-w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden text-center text-xl font-medium tracking-tight sm:gap-2 sm:text-3xl"
        >
          <span className="min-w-0 truncate" title={projectName}>
            {projectName}
          </span>
          <ChevronRight className="text-muted-foreground size-5 shrink-0" />
          <span className="min-w-0 truncate" title={sessionName}>
            {sessionName}
          </span>
          <ChevronRight className="text-muted-foreground size-5 shrink-0" />
          <span className="shrink-0">New chat</span>
        </h1>
        <PromptInput
          onSubmit={handleSubmit}
          disabled={startSession.isPending}
          inventory={inventory}
          selection={effectiveSelection}
          onSelectionChange={setSelection}
          autoFocus
          focusOnTyping
          trailingControl={
            <Button
              asChild
              type="button"
              variant="secondary"
              size="sm"
              className="h-10 shrink-0 gap-2 rounded-full px-4 font-normal"
            >
              <Link href={`${chatUrl}/terminal`}>
                <Terminal className="size-3.5" />
                Terminal
              </Link>
            </Button>
          }
        />
        {startSession.error ? (
          <p className="text-destructive mt-3 text-center text-sm">
            {startSession.error.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
