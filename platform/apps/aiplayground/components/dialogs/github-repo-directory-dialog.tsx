"use client";

import type { ProjectGithubRepo } from "@/services/project-services";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { FolderGit2 } from "lucide-react";

type GithubRepoDirectoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repos: ProjectGithubRepo[];
  isLoading: boolean;
  isError: boolean;
  onSelect: (directory: string) => void;
};

function getRepoName(fullName: string) {
  return fullName.split("/").filter(Boolean).at(-1) ?? fullName;
}

function getRepoDirectory(fullName: string) {
  return `/home/ubuntu/code/${getRepoName(fullName)}`;
}

export function GithubRepoDirectoryDialog({
  open,
  onOpenChange,
  repos,
  isLoading,
  isError,
  onSelect,
}: GithubRepoDirectoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Choose a repository</DialogTitle>
          <DialogDescription>
            Select which repository directory the new chat should use.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto py-2">
          {isLoading ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Loading connected repositories...
            </p>
          ) : null}
          {isError ? (
            <p className="text-destructive py-6 text-center text-sm">
              Could not load connected repositories.
            </p>
          ) : null}
          {!isLoading && !isError && repos.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No GitHub repositories are connected to this project.
            </p>
          ) : null}
          {repos.map((repo) => {
            const directory = getRepoDirectory(repo.full_name);

            return (
              <button
                key={repo.id}
                type="button"
                onClick={() => onSelect(directory)}
                className="hover:border-primary hover:bg-muted/50 flex w-full min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors"
              >
                <span className="bg-muted rounded-md p-2">
                  <FolderGit2 className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {repo.full_name}
                  </span>
                  <span
                    className="text-muted-foreground block truncate font-mono text-xs"
                    title={directory}
                  >
                    {directory}
                  </span>
                </span>
              </button>
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
