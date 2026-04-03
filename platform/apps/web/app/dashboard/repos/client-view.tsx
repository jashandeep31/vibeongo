"use client";

import { useState } from "react";
import {
  useGetGithubRepos,
  useDeleteGithubRepo,
  useUpdateGithubRepoById,
} from "@/hooks/use-github-repos";
import { CreateGithubRepoDialog } from "@/components/dialogs/create-github-repo-dialog";
import { Edit2, GitFork, Trash2 } from "lucide-react";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Textarea } from "@repo/ui/components/textarea";
import { toast } from "sonner";
import axios from "axios";

export default function ClientView() {
  const { data: githubRepos, isLoading } = useGetGithubRepos();
  const deleteRepoMutation = useDeleteGithubRepo();
  const updateRepoMutation = useUpdateGithubRepoById();
  const [editingRepo, setEditingRepo] = useState<{
    id: string;
    full_name: string;
    setup_script: string;
  } | null>(null);
  const [setupScriptDraft, setSetupScriptDraft] = useState("");

  const handleDelete = async (id: string) => {
    const toastId = toast.loading("Deleting repository...");
    try {
      await deleteRepoMutation.mutateAsync(id);
      toast.success("Repository deleted successfully", { id: toastId });
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to delete repository")
        : "Failed to delete repository";
      toast.error(message, { id: toastId });
    }
  };

  const openEditDialog = (repo: {
    id: string;
    full_name: string;
    setup_script: string;
  }) => {
    setEditingRepo(repo);
    setSetupScriptDraft(repo.setup_script ?? "");
  };

  const closeEditDialog = () => {
    if (updateRepoMutation.isPending) {
      return;
    }
    setEditingRepo(null);
    setSetupScriptDraft("");
  };

  const handleSaveSetupScript = async () => {
    if (!editingRepo) {
      return;
    }

    const toastId = toast.loading("Updating setup script...");

    try {
      await updateRepoMutation.mutateAsync({
        id: editingRepo.id,
        setup_script: setupScriptDraft,
      });
      toast.success("Setup script updated", { id: toastId });
      setEditingRepo(null);
      setSetupScriptDraft("");
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to update setup script")
        : "Failed to update setup script";
      toast.error(message, { id: toastId });
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            GitHub Repositories
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect and manage your GitHub repositories.
          </p>
        </div>
        <CreateGithubRepoDialog />
      </div>

      <div className="mt-8 grid gap-4 space-y-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-4 rounded-lg border p-6"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : githubRepos && githubRepos.length > 0 ? (
          githubRepos.map((repo) => (
            <div
              key={repo.id}
              className="bg-card flex h-full items-start justify-between rounded-lg border p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 rounded-full p-2">
                  <GitFork className="text-primary h-5 w-5" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="truncate font-medium" title={repo.full_name}>
                    {repo.full_name}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        repo.public
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {repo.public ? "Public" : "Private"}
                    </span>
                  </div>

                  <div className="bg-muted/50 mt-3 rounded-md border p-2">
                    <p className="text-muted-foreground text-xs font-medium">
                      Setup Script
                    </p>
                    <pre className="mt-1 max-h-28 overflow-auto font-mono text-xs break-words whitespace-pre-wrap">
                      {repo.setup_script || "No setup script configured."}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-muted"
                  onClick={() =>
                    openEditDialog({
                      id: repo.id,
                      full_name: repo.full_name,
                      setup_script: repo.setup_script ?? "",
                    })
                  }
                >
                  <Edit2 className="h-4 w-4" />
                </Button>

                <ConfirmationDialog
                  title="Delete Repository"
                  description="Are you sure you want to remove this GitHub repository from your platform account? This won't delete the repository on GitHub, only your connection to it here."
                  confirmText="Delete"
                  isDestructive
                  onConfirm={() => handleDelete(repo.id)}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </ConfirmationDialog>
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground col-span-full rounded-lg border border-dashed p-12 text-center">
            <GitFork className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <h3 className="mb-1 text-lg font-medium">No repositories found</h3>
            <p className="text-sm">
              Connect a GitHub repository to get started.
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={!!editingRepo}
        onOpenChange={(open) => !open && closeEditDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Setup Script</DialogTitle>
            <DialogDescription>
              Update the setup script for{" "}
              {editingRepo?.full_name ?? "this repository"}.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={setupScriptDraft}
            onChange={(e) => setSetupScriptDraft(e.target.value)}
            placeholder="#!/usr/bin/env bash\nnpm install\nnpm run build"
            className="min-h-40 font-mono text-xs"
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeEditDialog}
              disabled={updateRepoMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleSaveSetupScript();
              }}
              disabled={
                updateRepoMutation.isPending ||
                !editingRepo ||
                setupScriptDraft === (editingRepo.setup_script ?? "")
              }
            >
              {updateRepoMutation.isPending ? "Saving..." : "Save Script"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
