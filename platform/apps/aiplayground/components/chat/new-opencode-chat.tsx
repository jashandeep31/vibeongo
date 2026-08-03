"use client";

import { PromptInput } from "@/components/chat/prompt-input";
import { useOpencodeInventory } from "@/hooks/use-opencode-session";
import { useStartOpencodeSession } from "@/hooks/use-opencode-sessions";
import type { OpencodePromptSelection } from "@/services/opencode-services";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewOpencodeChat({
  chatId,
  chatUrl,
  directory,
}: {
  chatId: string;
  chatUrl: string;
  directory?: string;
}) {
  const router = useRouter();
  const startSession = useStartOpencodeSession();
  const { data: inventory } = useOpencodeInventory(chatId);
  const [selection, setSelection] = useState<OpencodePromptSelection>({});
  const effectiveSelection: OpencodePromptSelection = {
    model: selection.model ?? inventory?.models[0]?.id,
    variant: selection.variant,
    agent:
      selection.agent ??
      inventory?.agents.find((agent) => agent.mode === "primary")?.id ??
      inventory?.agents[0]?.id,
  };

  const handleSubmit = async (text: string, files: File[]) => {
    const session = await startSession.mutateAsync({
      chatId,
      directory,
      text,
      files,
      selection: effectiveSelection,
    });
    router.replace(`${chatUrl}/sessions/${encodeURIComponent(session.id)}`);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <section className="w-full max-w-4xl" aria-labelledby="new-chat-heading">
        <h1
          id="new-chat-heading"
          className="mb-8 text-center text-3xl font-medium tracking-tight sm:text-4xl"
        >
          What should we work on?
        </h1>
        <PromptInput
          onSubmit={(text, files) => void handleSubmit(text, files)}
          disabled={startSession.isPending}
          inventory={inventory}
          selection={effectiveSelection}
          onSelectionChange={setSelection}
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
