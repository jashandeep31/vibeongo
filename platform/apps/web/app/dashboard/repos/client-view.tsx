"use client";

import { useMemo, useState } from "react";
import {
  useGetGithubRepos,
  useDeleteGithubRepo,
  useUpdateGithubRepoById,
} from "@/hooks/use-github-repos";
import { useGetProjects } from "@/hooks/use-project";
import { CreateGithubRepoDialog } from "@/components/dialogs/create-github-repo-dialog";
import { Edit2, GitFork, Trash2 } from "lucide-react";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { Button, buttonVariants } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Textarea } from "@repo/ui/components/textarea";
import { toast } from "sonner";
import axios from "axios";
import Link from "next/link";

const NO_DEFAULT_PROJECT = "__none__";

export default function ClientView() {
  const { data: githubRepos, isLoading } = useGetGithubRepos();
  const { data: projects, isLoading: isProjectsLoading } = useGetProjects();
  const deleteRepoMutation = useDeleteGithubRepo();
  const updateRepoMutation = useUpdateGithubRepoById();

  const projectNameById = useMemo(() => {
    return new Map(
      (projects ?? []).map((project) => [project.id, project.name]),
    );
  }, [projects]);

  const [editingRepo, setEditingRepo] = useState<{
    id: string;
    full_name: string;
    setup_script: string;
    default_project_id: string | null;
  } | null>(null);
  const [setupScriptDraft, setSetupScriptDraft] = useState("");
  const [defaultProjectIdDraft, setDefaultProjectIdDraft] =
    useState(NO_DEFAULT_PROJECT);

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
    default_project_id: string | null;
  }) => {
    setEditingRepo(repo);
    setSetupScriptDraft(repo.setup_script ?? "");
    setDefaultProjectIdDraft(repo.default_project_id ?? NO_DEFAULT_PROJECT);
  };

  const closeEditDialog = () => {
    if (updateRepoMutation.isPending) {
      return;
    }
    setEditingRepo(null);
    setSetupScriptDraft("");
    setDefaultProjectIdDraft(NO_DEFAULT_PROJECT);
  };

  const handleSaveSetupScript = async () => {
    if (!editingRepo) {
      return;
    }

    const selectedProjectId =
      defaultProjectIdDraft === NO_DEFAULT_PROJECT
        ? null
        : defaultProjectIdDraft;

    const toastId = toast.loading("Updating repository settings...");

    try {
      await updateRepoMutation.mutateAsync({
        id: editingRepo.id,
        setup_script: setupScriptDraft,
        default_project_id: selectedProjectId,
      });
      toast.success("Repository settings updated", { id: toastId });
      setEditingRepo(null);
      setSetupScriptDraft("");
      setDefaultProjectIdDraft(NO_DEFAULT_PROJECT);
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to update repository")
        : "Failed to update repository";
      toast.error(message, { id: toastId });
    }
  };

  const hasUnsavedChanges =
    !!editingRepo &&
    (setupScriptDraft !== (editingRepo.setup_script ?? "") ||
      (defaultProjectIdDraft === NO_DEFAULT_PROJECT
        ? null
        : defaultProjectIdDraft) !== (editingRepo.default_project_id ?? null));

  return (
    <div className="p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">
            GitHub Repositories
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect and manage your GitHub repositories.
          </p>
        </div>
        <div className="shrink-0">
          <CreateGithubRepoDialog />
        </div>
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
          githubRepos.map((repo) => {
            const defaultProjectName = !repo.default_project_id
              ? "No default project"
              : isProjectsLoading
                ? "Loading project..."
                : (projectNameById.get(repo.default_project_id) ??
                  "Project not found");

            return (
              <div
                key={repo.id}
                className="bg-card flex h-full min-w-0 flex-col gap-4 rounded-lg border p-4 shadow-sm sm:p-6"
              >
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="bg-primary/10 shrink-0 rounded-full p-2">
                      <GitFork className="text-primary h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3
                        className="[display:-webkit-box] overflow-hidden leading-5 font-medium break-all [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                        title={repo.full_name}
                      >
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

                  <div className="flex shrink-0 items-center justify-end gap-1 sm:justify-start">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-muted"
                      onClick={() =>
                        openEditDialog({
                          id: repo.id,
                          full_name: repo.full_name,
                          setup_script: repo.setup_script ?? "",
                          default_project_id: repo.default_project_id ?? null,
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

                {repo.default_project_id ? (
                  <div className="bg-muted/50 rounded-md border p-2">
                    <p className="text-muted-foreground text-xs font-medium">
                      Default Project
                    </p>
                    <p
                      className="mt-1 truncate text-xs"
                      title={defaultProjectName}
                    >
                      {defaultProjectName}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border border-yellow-500/20 bg-yellow-500/10 p-2 text-yellow-700 dark:text-yellow-400">
                    <p className="text-xs font-medium">No Default Project</p>
                    <p className="mt-1 text-xs">
                      Assign a project to use this repository.
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/repos/${repo.id}/issues`}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Issues
                  </Link>
                  <Link
                    href={""}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Pull requests
                  </Link>
                </div>
              </div>
            );
          })
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
            <DialogTitle>Edit Repository Settings</DialogTitle>
            <DialogDescription>
              Update the setup script and default project for{" "}
              {editingRepo?.full_name ?? "this repository"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm font-medium">Default Project</p>
            <Select
              value={defaultProjectIdDraft}
              onValueChange={setDefaultProjectIdDraft}
              disabled={updateRepoMutation.isPending}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Select a default project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_DEFAULT_PROJECT}>
                  No default project
                </SelectItem>
                {isProjectsLoading ? (
                  <SelectItem value="__loading_projects__" disabled>
                    Loading projects...
                  </SelectItem>
                ) : (projects?.length ?? 0) > 0 ? (
                  projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__no_projects__" disabled>
                    No projects available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

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
                !hasUnsavedChanges
              }
            >
              {updateRepoMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
