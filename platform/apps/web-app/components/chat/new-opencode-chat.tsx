"use client";

import {
  OpencodeComposer,
  type OpencodeComposerAction,
} from "@/components/chat/opencode-composer";
import {
  useOpencodeCommands,
  useOpencodeInventory,
  useReloadOpencodeConfig,
} from "@repo/api-hooks";
import { useStartOpencodeSession } from "@repo/api-hooks";
import { useUserSettings } from "@repo/api-hooks";
import {
  findOpencodeFiles,
  type OpencodeFileReference,
  type OpencodePromptSelection,
} from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import { ChevronRight, Terminal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

export function NewOpencodeChat({
  chatId,
  chatUrl,
  serverUrl,
  accessToken,
  password,
  directory,
  projectName,
  sessionName,
  onOpenWorktrees,
}: {
  chatId: string;
  chatUrl: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
  directory?: string;
  projectName: string;
  sessionName: string;
  onOpenWorktrees?: () => void;
}) {
  const router = useRouter();
  const startSession = useStartOpencodeSession();
  const inventoryQuery = useOpencodeInventory(
    chatId,
    serverUrl,
    accessToken,
    password,
  );
  const inventory = inventoryQuery.data;
  const { data: commands } = useOpencodeCommands(
    chatId,
    serverUrl,
    accessToken,
    directory,
    password,
  );
  const { data: userSettings } = useUserSettings();
  const [selection, setSelection] = useState<OpencodePromptSelection>({});
  const configuredDefaultModel = userSettings?.default_model ?? undefined;
  const defaultModel = inventory?.models.some(
    (model) => model.id === configuredDefaultModel,
  )
    ? configuredDefaultModel
    : inventory?.models[0]?.id;
  const effectiveSelection: OpencodePromptSelection = {
    model: selection.model ?? defaultModel,
    variant: selection.variant,
    agent:
      selection.agent ??
      inventory?.agents.find((agent) => agent.mode === "primary")?.id ??
      inventory?.agents[0]?.id,
  };

  const reloadConfig = useReloadOpencodeConfig({
    chatId,
    serverUrl,
    accessToken,
    password,
    directory,
  });
  const composerActions = useMemo<OpencodeComposerAction[]>(
    () => [
      {
        name: "reload",
        description: "Reload OpenCode config",
        run: () =>
          reloadConfig.mutate(undefined, {
            onSuccess: () => toast.success("OpenCode config reloaded"),
            onError: (error) =>
              toast.error(error.message || "Could not reload config"),
          }),
      },
      ...(onOpenWorktrees
        ? [
            {
              name: "worktree",
              description: "Manage worktrees",
              run: onOpenWorktrees,
            },
          ]
        : []),
    ],
    [onOpenWorktrees, reloadConfig.mutate],
  );

  const searchFiles = useCallback(
    (query: string) =>
      findOpencodeFiles(
        chatId,
        serverUrl,
        accessToken,
        query,
        directory,
        password,
      ),
    [accessToken, chatId, directory, password, serverUrl],
  );

  const handleSubmit = (
    text: string,
    files: File[],
    fileReferences: OpencodeFileReference[],
  ) => {
    startSession.mutate({
      chatId,
      serverUrl,
      accessToken,
      password,
      directory,
      text,
      files,
      fileReferences,
      selection: effectiveSelection,
      onSessionCreated: (sessionId) => {
        const params = new URLSearchParams({ serverUrl });
        router.replace(
          `${chatUrl}/chats/${encodeURIComponent(sessionId)}?${params.toString()}`,
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
        <OpencodeComposer
          onSubmit={handleSubmit}
          disabled={startSession.isPending}
          inventory={inventory}
          providerConnection={{
            accessToken,
            chatId,
            directory,
            onConnected: async () => {
              await inventoryQuery.refetch();
            },
            password,
            serverUrl,
          }}
          selection={effectiveSelection}
          onSelectionChange={setSelection}
          searchFiles={searchFiles}
          commands={commands}
          actions={composerActions}
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
