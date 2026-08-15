"use client";

import { useUpdateGithubRepoAutomation } from "@repo/api-hooks";
import { useGetProjects } from "@repo/api-hooks";
import type { GithubRepo } from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Switch } from "@repo/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import axios from "axios";
import { GitPullRequest, Settings, WandSparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

const NO_DEFAULT_PROJECT = "__none__";

export function GithubAutomationSettingsDialog({
  repo,
  children,
}: {
  repo: GithubRepo;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [autoReviewPullRequests, setAutoReviewPullRequests] = useState(false);
  const [autoFixIssues, setAutoFixIssues] = useState(false);
  const [defaultProjectId, setDefaultProjectId] = useState(NO_DEFAULT_PROJECT);
  const updateAutomation = useUpdateGithubRepoAutomation();
  const { data: projects = [], isPending: areProjectsPending } =
    useGetProjects(open);

  useEffect(() => {
    if (!open) return;
    setAutoReviewPullRequests(repo.auto_review_pull_requests_enabled);
    setAutoFixIssues(repo.auto_fix_issues_enabled);
    setDefaultProjectId(repo.default_project_id ?? NO_DEFAULT_PROJECT);
  }, [open, repo]);

  const hasChanges =
    autoReviewPullRequests !== repo.auto_review_pull_requests_enabled ||
    autoFixIssues !== repo.auto_fix_issues_enabled ||
    (defaultProjectId === NO_DEFAULT_PROJECT ? null : defaultProjectId) !==
      repo.default_project_id;

  const handleSave = async () => {
    const toastId = toast.loading("Saving automation settings...");

    try {
      await updateAutomation.mutateAsync({
        id: repo.id,
        setup_script: repo.setup_script,
        default_project_id:
          defaultProjectId === NO_DEFAULT_PROJECT ? null : defaultProjectId,
        auto_review_pull_requests_enabled: autoReviewPullRequests,
        auto_fix_issues_enabled: autoFixIssues,
      });
      toast.success("Automation settings updated", { id: toastId });
      setOpen(false);
    } catch (error: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to update settings")
        : "Failed to update settings";
      toast.error(message, { id: toastId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline">
            <Settings /> Automation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Repository automation</DialogTitle>
          <DialogDescription>
            Choose which GitHub events should automatically start an AI task for{" "}
            {repo.full_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-2 rounded-xl border p-4">
            <div>
              <p className="font-medium">Default project</p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                AI reviews and fixes will run inside this project.
              </p>
            </div>
            <Select
              value={defaultProjectId}
              onValueChange={setDefaultProjectId}
              disabled={updateAutomation.isPending || areProjectsPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_DEFAULT_PROJECT}>
                  No default project
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-start justify-between gap-5 rounded-xl border p-4">
            <span className="flex min-w-0 gap-3">
              <GitPullRequest className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block font-medium">
                  Auto-review pull requests
                </span>
                <span className="text-muted-foreground mt-1 block text-xs leading-5">
                  Start an AI review when a pull request is opened.
                </span>
              </span>
            </span>
            <Switch
              checked={autoReviewPullRequests}
              onCheckedChange={setAutoReviewPullRequests}
              disabled={updateAutomation.isPending}
              aria-label="Automatically review pull requests"
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-5 rounded-xl border p-4">
            <span className="flex min-w-0 gap-3">
              <WandSparkles className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block font-medium">Auto-fix issues</span>
                <span className="text-muted-foreground mt-1 block text-xs leading-5">
                  Start an AI fix when a new issue is opened.
                </span>
              </span>
            </span>
            <Switch
              checked={autoFixIssues}
              onCheckedChange={setAutoFixIssues}
              disabled={updateAutomation.isPending}
              aria-label="Automatically fix issues"
            />
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={updateAutomation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!hasChanges || updateAutomation.isPending}
          >
            {updateAutomation.isPending ? "Saving..." : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
