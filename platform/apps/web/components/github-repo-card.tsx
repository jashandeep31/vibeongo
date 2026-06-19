"use client";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import type { GithubRepo } from "@/services/github-repo-services";
import { Badge } from "@repo/ui/components/badge";
import { Button, buttonVariants } from "@repo/ui/components/button";
import {
  CircleDot,
  Edit2,
  GitFork,
  GitPullRequest,
  Trash2,
} from "lucide-react";
import Link from "next/link";

type GithubRepoCardProps = {
  repo: GithubRepo;
  defaultProjectName: string;
  onEdit: (repo: GithubRepo) => void;
  onDelete: (id: string) => void;
};

export function GithubRepoCard({
  repo,
  defaultProjectName,
  onEdit,
  onDelete,
}: GithubRepoCardProps) {
  return (
    <div className="bg-card flex h-full min-w-0 flex-col gap-4 rounded-lg border p-4 shadow-sm sm:p-6">
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
              <Badge
                className={`rounded-full px-2 py-0.5 text-xs ${
                  repo.public
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}
              >
                {repo.public ? "Public" : "Private"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1 sm:justify-start">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted"
            onClick={() => onEdit(repo)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>

          <ConfirmationDialog
            title="Delete Repository"
            description="Are you sure you want to remove this GitHub repository from your platform account? This won't delete the repository on GitHub, only your connection to it here."
            confirmText="Delete"
            isDestructive
            onConfirm={() => onDelete(repo.id)}
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
          <p className="mt-1 truncate text-xs" title={defaultProjectName}>
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

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className="text-muted-foreground h-5 gap-1 rounded-full px-1.5 text-[11px] font-normal"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              repo.auto_fix_issues_enabled
                ? "bg-emerald-500"
                : "bg-muted-foreground/40"
            }`}
          />
          Issues auto {repo.auto_fix_issues_enabled ? "on" : "off"}
        </Badge>
        <Badge
          variant="outline"
          className="text-muted-foreground h-5 gap-1 rounded-full px-1.5 text-[11px] font-normal"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              repo.auto_review_pull_requests_enabled
                ? "bg-emerald-500"
                : "bg-muted-foreground/40"
            }`}
          />
          PR auto {repo.auto_review_pull_requests_enabled ? "on" : "off"}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/repos/${repo.id}/issues`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <CircleDot className="h-3.5 w-3.5" />
          Issues
        </Link>
        <Link
          href={`/dashboard/repos/${repo.id}/pull-requests`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <GitPullRequest className="h-3.5 w-3.5" />
          Pull requests
        </Link>
      </div>
    </div>
  );
}
