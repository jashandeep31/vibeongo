"use client";

import { useMemo, useState } from "react";
import {
  useGetGithubRepos,
  useDeleteGithubRepo,
  useScheduleGithubRepoOverview,
} from "@/hooks/use-github-repos";
import { useGetProjects } from "@/hooks/use-project";
import { CreateGithubRepoDialog } from "@/components/dialogs/create-github-repo-dialog";
import { EditGithubRepoDialog } from "@/components/dialogs/edit-github-repo-dialog";
import {
  ExternalLink,
  GitFork,
  Github,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Button } from "@repo/ui/components/button";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { toast } from "sonner";
import axios from "axios";
import type { GithubRepo } from "@/services/github-repo-services";
import { GithubRepoCard } from "@/components/github-repo-card";

function GithubRepoOverviewAction({ repo }: { repo: GithubRepo }) {
  const scheduleOverview = useScheduleGithubRepoOverview();
  const hasOverview = repo.overview.trim().length > 0;

  const handleScheduleOverview = async () => {
    const toastId = toast.loading(
      hasOverview ? "Scheduling overview refresh..." : "Scheduling overview...",
    );

    try {
      await scheduleOverview.mutateAsync(repo.id);
      toast.success(
        hasOverview ? "Overview refresh queued" : "Overview generation queued",
        { id: toastId },
      );
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to queue the overview")
        : "Failed to queue the overview";
      toast.error(message, { id: toastId });
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      className="mt-auto w-full"
      disabled={scheduleOverview.isPending}
      onClick={() => void handleScheduleOverview()}
    >
      {scheduleOverview.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : hasOverview ? (
        <RefreshCw className="h-3.5 w-3.5" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {scheduleOverview.isPending
        ? "Queuing..."
        : hasOverview
          ? "Refresh Overview"
          : "Generate AI Overview"}
    </Button>
  );
}

export default function ClientView() {
  const { data: githubRepos, isLoading } = useGetGithubRepos();
  const { data: projects, isLoading: isProjectsLoading } = useGetProjects();
  const deleteRepoMutation = useDeleteGithubRepo();

  const projectNameById = useMemo(() => {
    return new Map(
      (projects ?? []).map((project) => [project.id, project.name]),
    );
  }, [projects]);

  const [editingRepo, setEditingRepo] = useState<GithubRepo | null>(null);

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

  return (
    <div className="p-4 md:p-8">
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
      <Alert className="mt-6">
        <Github className="h-4 w-4" />
        <AlertTitle>Install the GitHub App first</AlertTitle>
        <AlertDescription>
          Install the Vibeongo GitHub App on a repository before adding it here.{" "}
          <a
            href="https://github.com/apps/vibeongo/installations/new"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium"
          >
            Install GitHub App
            <ExternalLink className="h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>
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
              <GithubRepoCard
                key={repo.id}
                repo={repo}
                defaultProjectName={defaultProjectName}
                onEdit={setEditingRepo}
                onDelete={(id) => {
                  void handleDelete(id);
                }}
                footer={<GithubRepoOverviewAction repo={repo} />}
              />
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
      <EditGithubRepoDialog
        repo={editingRepo}
        projects={projects}
        isProjectsLoading={isProjectsLoading}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRepo(null);
          }
        }}
      />
    </div>
  );
}
