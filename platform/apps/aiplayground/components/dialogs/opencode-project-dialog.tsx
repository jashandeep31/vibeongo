"use client";

import type { OpencodeProject } from "@/services/opencode-services";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { FolderGit2, GitBranch } from "lucide-react";

type OpencodeProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: OpencodeProject[];
  isLoading: boolean;
  isError: boolean;
  onSelect: (directory: string) => void;
};

function getDirectoryName(directory: string) {
  return directory.split(/[\\/]/).filter(Boolean).at(-1) ?? directory;
}

export function OpencodeProjectDialog({
  open,
  onOpenChange,
  projects,
  isLoading,
  isError,
  onSelect,
}: OpencodeProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Choose an OpenCode project</DialogTitle>
          <DialogDescription>
            Select the project directory where the new chat should run.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2">
          {isLoading ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Loading OpenCode projects...
            </p>
          ) : null}
          {isError ? (
            <p className="text-destructive py-6 text-center text-sm">
              Could not load OpenCode projects.
            </p>
          ) : null}
          {!isLoading && !isError && projects.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No OpenCode projects were found.
            </p>
          ) : null}
          {projects.map((project) => {
            const directories = [
              {
                directory: project.worktree,
                label: "Worktree",
                Icon: FolderGit2,
              },
              ...project.sandboxes.map((directory) => ({
                directory,
                label: "Sandbox",
                Icon: GitBranch,
              })),
            ].filter((item) => Boolean(item.directory));

            return (
              <section key={project.id} className="space-y-2">
                <div className="px-1">
                  <p className="truncate text-sm font-medium">
                    {project.id === "global"
                      ? "Global"
                      : getDirectoryName(project.worktree) || project.id}
                  </p>
                </div>
                <div className="grid gap-2">
                  {directories.map(({ directory, label, Icon }) => (
                    <button
                      key={directory}
                      type="button"
                      onClick={() => onSelect(directory)}
                      className="hover:border-primary hover:bg-muted/50 flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                    >
                      <span className="bg-muted rounded-md p-2">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {label}: {getDirectoryName(directory)}
                        </span>
                        <span
                          className="text-muted-foreground block truncate text-xs"
                          title={directory}
                        >
                          {directory}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
