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

        <div className="max-h-[60vh] overflow-y-auto py-2">
          <TerminalDirectoryList dirs={dirs} disabled={isCreating} onSelect={onSelect} />
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

export function TerminalDirectoryList({
  dirs,
  disabled,
  onSelect,
}: {
  dirs: WebFavoriteDir[];
  disabled: boolean;
  onSelect: (workingDirectory?: string) => void;
}) {
  return (
    <div className="space-y-1">
      {dirs.map((dir) => (
        <DirectoryButton
          key={dir.path}
          description={dir.path}
          disabled={disabled}
          icon={dir.name === "Home" ? <House className="size-4" /> : <Folder className="size-4" />}
          name={dir.name}
          onClick={() => onSelect(dir.path)}
        />
      ))}
      {dirs.length === 0 ? (
        <DirectoryButton
          description="Default runtime home directory"
          disabled={disabled}
          icon={<House className="size-4" />}
          name="Home"
          onClick={() => onSelect()}
        />
      ) : null}
    </div>
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
      className="hover:bg-muted/50 focus-visible:ring-ring flex w-full min-w-0 items-center gap-2.5 rounded-md p-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span
          className="text-muted-foreground block truncate text-left font-mono text-xs [direction:rtl]"
          title={description}
        >
          {description}
        </span>
      </span>
    </button>
  );
}
