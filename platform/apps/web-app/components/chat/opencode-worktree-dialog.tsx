"use client";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import type { OpencodeWorktree } from "@repo/api-client";
import {
  useOpencodeWorktrees,
  useRemoveOpencodeWorktree,
} from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Folder, GitBranch, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type OpencodeWorktreeConnection = {
  chatId: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
};

export function OpencodeWorktreeDialog({
  connection,
  currentDirectory,
  open,
  onOpenChange,
  onSelect,
}: {
  connection: OpencodeWorktreeConnection;
  currentDirectory?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (directory: string) => void;
}) {
  const worktreesQuery = useOpencodeWorktrees(
    connection.chatId,
    connection.serverUrl,
    connection.accessToken,
    currentDirectory,
    connection.password,
    open,
  );
  const removeWorktree = useRemoveOpencodeWorktree(connection);
  const projectId = worktreesQuery.data?.projectId;
  const busy = removeWorktree.isPending;

  const remove = (worktree: OpencodeWorktree) => {
    if (!projectId) return;
    removeWorktree.mutate(
      { projectId, directory: worktree.directory },
      {
        onSuccess: () => toast.success("Worktree removed"),
        onError: (error) =>
          toast.error(error.message || "Could not remove worktree"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Worktrees</DialogTitle>
          <DialogDescription>
            Pick a worktree to start a new chat in it.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto py-2">
          {!currentDirectory ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Open a chat inside a repository to use worktrees.
            </p>
          ) : worktreesQuery.isLoading ? (
            <div className="text-muted-foreground flex h-16 items-center justify-center gap-2 text-sm">
              <LoaderCircle className="size-4 animate-spin" /> Loading
              worktrees…
            </div>
          ) : worktreesQuery.error ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {worktreesQuery.error.message}
            </p>
          ) : (
            worktreesQuery.data?.worktrees.map((worktree) => (
              <WorktreeRow
                key={worktree.directory}
                current={worktree.directory === currentDirectory}
                disabled={busy}
                worktree={worktree}
                onSelect={() => onSelect(worktree.directory)}
                onRemove={
                  worktree.type === "worktree" &&
                  worktree.directory !== currentDirectory
                    ? () => remove(worktree)
                    : undefined
                }
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorktreeRow({
  current,
  disabled,
  worktree,
  onSelect,
  onRemove,
}: {
  current: boolean;
  disabled: boolean;
  worktree: OpencodeWorktree;
  onSelect: () => void;
  onRemove?: () => void;
}) {
  const isRoot = worktree.type === "root";
  const folderName =
    worktree.directory.split("/").filter(Boolean).at(-1) ?? "Worktree";
  const name = isRoot ? `${folderName} (main)` : folderName;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border ${
        current ? "border-foreground/40" : ""
      }`}
    >
      <button
        className="hover:bg-muted/50 flex min-w-0 flex-1 items-center gap-3 rounded-lg p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        type="button"
        onClick={onSelect}
      >
        <span className="bg-muted rounded-md p-2">
          {isRoot ? (
            <Folder className="size-4" />
          ) : (
            <GitBranch className="size-4" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {name}
            {current ? (
              <span className="text-muted-foreground font-normal">
                {" "}
                · current
              </span>
            ) : null}
          </span>
          <span
            className="text-muted-foreground block truncate font-mono text-xs"
            title={worktree.directory}
          >
            {worktree.directory}
          </span>
        </span>
      </button>
      {onRemove ? (
        <ConfirmationDialog
          title="Remove worktree?"
          description={`${worktree.directory} will be deleted. Uncommitted changes block removal.`}
          confirmText="Remove"
          isDestructive
          onConfirm={onRemove}
        >
          <Button
            aria-label={`Remove ${name}`}
            className="mr-2 shrink-0"
            disabled={disabled}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Trash2 />
          </Button>
        </ConfirmationDialog>
      ) : null}
    </div>
  );
}
