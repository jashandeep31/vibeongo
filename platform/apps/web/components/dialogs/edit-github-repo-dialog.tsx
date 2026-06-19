"use client";

import { useEffect, useState } from "react";
import { useUpdateGithubRepoById } from "@/hooks/use-github-repos";
import type { GithubRepo } from "@/services/github-repo-services";
import { Button } from "@repo/ui/components/button";
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

const NO_DEFAULT_PROJECT = "__none__";

type ProjectOption = {
  id: string;
  name: string;
};

type EditGithubRepoDialogProps = {
  repo: GithubRepo | null;
  projects?: ProjectOption[];
  isProjectsLoading: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditGithubRepoDialog({
  repo,
  projects,
  isProjectsLoading,
  onOpenChange,
}: EditGithubRepoDialogProps) {
  const updateRepoMutation = useUpdateGithubRepoById();
  const [setupScriptDraft, setSetupScriptDraft] = useState("");
  const [defaultProjectIdDraft, setDefaultProjectIdDraft] =
    useState(NO_DEFAULT_PROJECT);

  useEffect(() => {
    setSetupScriptDraft(repo?.setup_script ?? "");
    setDefaultProjectIdDraft(repo?.default_project_id ?? NO_DEFAULT_PROJECT);
  }, [repo]);

  const closeDialog = () => {
    if (updateRepoMutation.isPending) {
      return;
    }

    onOpenChange(false);
  };

  const selectedProjectId =
    defaultProjectIdDraft === NO_DEFAULT_PROJECT ? null : defaultProjectIdDraft;

  const hasUnsavedChanges =
    !!repo &&
    (setupScriptDraft !== (repo.setup_script ?? "") ||
      selectedProjectId !== (repo.default_project_id ?? null));

  const handleSave = async () => {
    if (!repo) {
      return;
    }

    const toastId = toast.loading("Updating repository settings...");

    try {
      await updateRepoMutation.mutateAsync({
        id: repo.id,
        setup_script: setupScriptDraft,
        default_project_id: selectedProjectId,
      });
      toast.success("Repository settings updated", { id: toastId });
      onOpenChange(false);
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to update repository")
        : "Failed to update repository";
      toast.error(message, { id: toastId });
    }
  };

  return (
    <Dialog open={!!repo} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Repository Settings</DialogTitle>
          <DialogDescription>
            Update the setup script and default project for{" "}
            {repo?.full_name ?? "this repository"}.
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
            onClick={closeDialog}
            disabled={updateRepoMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={
              updateRepoMutation.isPending || !repo || !hasUnsavedChanges
            }
          >
            {updateRepoMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
