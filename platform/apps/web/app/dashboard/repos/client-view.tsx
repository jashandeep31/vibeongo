"use client";

import {
  useGetGithubRepos,
  useDeleteGithubRepo,
} from "@/hooks/use-github-repos";
import { CreateGithubRepoDialog } from "@/components/dialogs/create-github-repo-dialog";
import { GitFork, Trash2 } from "lucide-react";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { Button } from "@repo/ui/components/button";
import { toast } from "sonner";

export default function ClientView() {
  const { data: githubRepos, isLoading } = useGetGithubRepos();
  const deleteRepoMutation = useDeleteGithubRepo();

  const handleDelete = async (id: string) => {
    const toastId = toast.loading("Deleting repository...");
    try {
      await deleteRepoMutation.mutateAsync(id);
      toast.success("Repository deleted successfully", { id: toastId });
    } catch (error: any) {
      console.error(error);
      const message =
        error?.response?.data?.message || "Failed to delete repository";
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
              className="bg-card flex h-full items-center justify-between rounded-lg border p-6 shadow-sm"
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
                </div>
              </div>

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
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </ConfirmationDialog>
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
    </div>
  );
}
