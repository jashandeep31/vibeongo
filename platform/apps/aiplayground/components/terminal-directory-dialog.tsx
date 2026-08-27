"use client";

import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Folder, House, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

import type { WebFavoriteDir } from "@/hooks/use-web-terminal-workspace-socket";

type TerminalDirectoryDialogProps = {
  dirs: WebFavoriteDir[];
  isCreating: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (workingDirectory?: string) => void;
  open: boolean;
};

export function TerminalDirectoryDialog({
  dirs,
  isCreating,
  onOpenChange,
  onSelect,
  open,
}: TerminalDirectoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Choose a terminal directory</DialogTitle>
          <DialogDescription>
            The new terminal will start in the directory you select.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto py-2">
          {dirs.map((dir) => (
            <DirectoryButton
              key={dir.path}
              description={dir.path}
              disabled={isCreating}
              icon={
                dir.name === "Home" ? (
                  <House className="size-4" />
                ) : (
                  <Folder className="size-4" />
                )
              }
              name={dir.name}
              onClick={() => onSelect(dir.path)}
            />
          ))}

          {dirs.length === 0 ? (
            <DirectoryButton
              description="Default runtime home directory"
              disabled={isCreating}
              icon={<House className="size-4" />}
              name="Home"
              onClick={() => onSelect()}
            />
          ) : null}
        </div>

        <DialogFooter>
          <Button
            disabled={isCreating}
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {isCreating ? <LoaderCircle className="animate-spin" /> : null}
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DirectoryButton({
  description,
  disabled,
  icon,
  name,
  onClick,
}: {
  description: string;
  disabled: boolean;
  icon: ReactNode;
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      className="hover:border-primary hover:bg-muted/50 disabled:hover:border-border flex w-full min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      <span className="bg-muted rounded-md p-2">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span
          className="text-muted-foreground block truncate font-mono text-xs"
          title={description}
        >
          {description}
        </span>
      </span>
    </button>
  );
}
