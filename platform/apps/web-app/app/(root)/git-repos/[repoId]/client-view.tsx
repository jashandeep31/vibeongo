"use client";

import { GithubAutomationSettingsDialog } from "@/components/dialogs/github-automation-settings-dialog";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import {
  useDeleteGithubRepo,
  useGenerateFixForIssue,
  useGenerateReviewForPullRequest,
  useGitRepoActivity,
  useGitRepoById,
  useScheduleGithubRepoOverview,
} from "@repo/api-hooks";
import type { GitRepoIssue, GitRepoPullRequest } from "@repo/api-client";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import axios from "axios";
import {
  ArrowUpRight,
  ChevronDown,
  CircleDot,
  GitBranch,
  GitFork,
  Github,
  GitPullRequest,
  Loader2,
  LockKeyhole,
  MessageSquare,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

function ActivitySkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border">
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex gap-3 border-b px-4 py-3 last:border-0">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
          <div className="w-full space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PullRequestCard({
  repoId,
  pullRequest,
  canAutomate,
}: {
  repoId: string;
  pullRequest: GitRepoPullRequest;
  canAutomate: boolean;
}) {
  const generateReview = useGenerateReviewForPullRequest(
    repoId,
    pullRequest.number,
  );

  const handleReview = async () => {
    const toastId = toast.loading("Starting pull request review...");
    try {
      await generateReview.mutateAsync();
      toast.success("AI review started", { id: toastId });
    } catch (error: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to start review")
        : "Failed to start review";
      toast.error(message, { id: toastId });
    }
  };

  const reviewButton = (
    <Button
      size="icon-sm"
      variant="ghost"
      className="shrink-0 cursor-pointer"
      disabled={generateReview.isPending}
      aria-label={`Review pull request #${pullRequest.number}`}
      title="Review with AI"
    >
      {generateReview.isPending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Sparkles />
      )}
    </Button>
  );

  const isMerged = Boolean(pullRequest.merged_at);
  const statusLabel = isMerged
    ? "Merged"
    : pullRequest.state === "open"
      ? "Open"
      : "Closed";

  return (
    <div className="hover:bg-muted/30 flex min-w-0 gap-3 border-b px-4 py-3 last:border-b-0">
      <GitPullRequest
        className={`mt-1 size-4 shrink-0 ${isMerged ? "text-violet-500" : pullRequest.state === "open" ? "text-emerald-500" : "text-muted-foreground"}`}
        aria-label={statusLabel}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Link
                href={`/git-repos/${repoId}/pull-requests/${pullRequest.number}`}
                className="truncate font-medium hover:underline"
              >
                {pullRequest.title}
              </Link>
              {pullRequest.draft ? <Badge variant="outline">Draft</Badge> : null}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              #{pullRequest.number} opened {formatDate(pullRequest.created_at)} by {pullRequest.user?.login ?? "unknown"}
              {pullRequest.head.ref && pullRequest.base.ref ? (
                <span className="ml-3 inline-flex items-center gap-1">
                  <GitBranch className="size-3" />
                  {pullRequest.head.ref} → {pullRequest.base.ref}
                </span>
              ) : null}
            </p>
          </div>
          {canAutomate ? (
            <ConfirmationDialog
              title="Review pull request"
              description={`Start an AI review for pull request #${pullRequest.number}?`}
              confirmText="Start review"
              onConfirm={() => void handleReview()}
            >
              {reviewButton}
            </ConfirmationDialog>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function IssueCard({
  repoId,
  issue,
  canAutomate,
}: {
  repoId: string;
  issue: GitRepoIssue;
  canAutomate: boolean;
}) {
  const generateFix = useGenerateFixForIssue(repoId, issue.number);

  const handleGenerateFix = async () => {
    const toastId = toast.loading("Starting issue fix...");
    try {
      await generateFix.mutateAsync();
      toast.success("AI fix started", { id: toastId });
    } catch (error: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to start issue fix")
        : "Failed to start issue fix";
      toast.error(message, { id: toastId });
    }
  };

  const generateFixButton = (
    <Button
      size="icon-sm"
      variant="ghost"
      className="shrink-0 cursor-pointer"
      disabled={generateFix.isPending}
      aria-label={`Generate a fix for issue #${issue.number}`}
      title="Generate fix with AI"
    >
      {generateFix.isPending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <WandSparkles />
      )}
    </Button>
  );

  return (
    <div className="hover:bg-muted/30 flex min-w-0 gap-3 border-b px-4 py-3 last:border-b-0">
      <CircleDot
        className={`mt-1 size-4 shrink-0 ${issue.state === "open" ? "text-emerald-500" : "text-muted-foreground"}`}
        aria-label={issue.state === "open" ? "Open" : "Closed"}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Link
                href={`/git-repos/${repoId}/issues/${issue.number}`}
                className="truncate font-medium hover:underline"
              >
                {issue.title}
              </Link>
              {issue.labels.map((label, index) => (
                <Badge
                  key={`${label.id ?? label.name ?? "label"}-${index}`}
                  variant="outline"
                  className="max-w-40 truncate px-1.5 py-0 font-normal"
                >
                  {label.name ?? "Label"}
                </Badge>
              ))}
            </div>
            <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 text-xs">
              <span>#{issue.number} opened {formatDate(issue.created_at)} by {issue.user?.login ?? "unknown"}</span>
              {issue.comments > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="size-3" /> {issue.comments}
                </span>
              ) : null}
            </p>
          </div>
          {canAutomate ? (
            <ConfirmationDialog
              title="Generate issue fix"
              description={`Start an AI fix for issue #${issue.number}?`}
              confirmText="Generate fix"
              onConfirm={() => void handleGenerateFix()}
            >
              {generateFixButton}
            </ConfirmationDialog>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ResourceEmpty({ type }: { type: "pull requests" | "issues" }) {
  return (
    <Empty className="min-h-64 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {type === "issues" ? <CircleDot /> : <GitPullRequest />}
        </EmptyMedia>
        <EmptyTitle>No {type} found</EmptyTitle>
        <EmptyDescription>
          This repository does not have any {type} to show yet.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export default function GithubRepoActivityView({ repoId }: { repoId: string }) {
  const router = useRouter();
  const [showOverview, setShowOverview] = useState(false);
  const [activeResource, setActiveResource] = useState<
    "pull-requests" | "issues"
  >("pull-requests");
  const scheduleOverview = useScheduleGithubRepoOverview();
  const deleteRepo = useDeleteGithubRepo();
  const repoQuery = useGitRepoById(repoId);
  const issuesQuery = useGitRepoActivity(repoId, "issue");
  const pullRequestsQuery = useGitRepoActivity(repoId, "pr");
  const repo = repoQuery.data;
  const isForgejo = repo?.type === "forgejo";
  const issues = issuesQuery.data?.data ?? [];
  const pullRequests = pullRequestsQuery.data?.data ?? [];
  const issuesPending = issuesQuery.isPending;
  const pullRequestsPending = pullRequestsQuery.isPending;
  const issuesError = issuesQuery.isError;
  const pullRequestsError = pullRequestsQuery.isError;
  const openIssues = issues.filter((issue) => issue.state === "open").length;
  const openPullRequests = pullRequests.filter(
    (pullRequest) => pullRequest.state === "open",
  ).length;

  const handleScheduleOverview = async () => {
    const hasOverview = Boolean(repo?.overview.trim());
    const toastId = toast.loading(
      hasOverview ? "Scheduling overview refresh..." : "Scheduling overview...",
    );

    try {
      await scheduleOverview.mutateAsync(repoId);
      toast.success(
        hasOverview ? "Overview refresh queued" : "Overview generation queued",
        { id: toastId },
      );
    } catch (error: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to queue overview")
        : "Failed to queue overview";
      toast.error(message, { id: toastId });
    }
  };

  const handleDeleteRepo = async () => {
    const toastId = toast.loading("Deleting repository...");

    try {
      await deleteRepo.mutateAsync(repoId);
      toast.success("Repository deleted", { id: toastId });
      router.push("/git-repos");
    } catch (error: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to delete repository")
        : "Failed to delete repository";
      toast.error(message, { id: toastId });
    }
  };

  if (repoQuery.isError || (issuesError && pullRequestsError)) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-10 md:px-10">
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Github />
            </EmptyMedia>
            <EmptyTitle>Repository activity could not be loaded</EmptyTitle>
            <EmptyDescription>Refresh the page to try again.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-6 md:px-10 md:py-8">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {repo ? (
            <>
              <div className="flex items-center gap-3">
                <div className="bg-foreground text-background flex size-9 shrink-0 items-center justify-center rounded-lg">
                  {isForgejo ? (
                    <GitFork className="size-4" />
                  ) : (
                    <Github className="size-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">
                    {repo.repo_owner_username}
                  </p>
                  <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">
                    {repo.full_name.split("/").at(-1)}
                  </h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-xs font-normal">
                      {isForgejo ? (
                        <GitFork className="size-3" />
                      ) : (
                        <Github className="size-3" />
                      )}
                      {isForgejo ? "Forgejo" : "GitHub"}
                    </Badge>
                    <Badge variant="outline" className="h-5 gap-1 px-1.5 text-xs font-normal">
                      {repo.public ? (
                        <ShieldCheck className="size-3" />
                      ) : (
                        <LockKeyhole className="size-3" />
                      )}
                      {repo.public ? "Public" : "Private"}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
          )}
        </div>
        {repo ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {repo.overview ? (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg"
                aria-expanded={showOverview}
                onClick={() => setShowOverview((visible) => !visible)}
              >
                {showOverview ? "Hide overview" : "Show overview"}
                <ChevronDown
                  className={`size-4 transition-transform ${showOverview ? "rotate-180" : ""}`}
                />
              </Button>
            ) : null}
            {repo.overview.trim() ? (
              <ConfirmationDialog
                title="Refresh repository overview"
                description="Generate a new AI overview for this repository? The current overview will be replaced when generation finishes."
                confirmText="Refresh overview"
                onConfirm={() => void handleScheduleOverview()}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer rounded-lg"
                  disabled={scheduleOverview.isPending}
                >
                  {scheduleOverview.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <RefreshCw />
                  )}
                  Refresh overview
                </Button>
              </ConfirmationDialog>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer rounded-lg"
                disabled={scheduleOverview.isPending}
                onClick={() => void handleScheduleOverview()}
              >
                {scheduleOverview.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                Create overview
              </Button>
            )}
            <GithubAutomationSettingsDialog repo={repo}>
              <Button variant="outline" size="sm" className="rounded-lg">
                <Settings /> Settings
              </Button>
            </GithubAutomationSettingsDialog>
            <ConfirmationDialog
              title="Delete repository"
              description="Remove this repository from VibeOngo? The repository itself will not be deleted from its Git provider."
              confirmText="Delete"
              isDestructive
              onConfirm={() => void handleDeleteRepo()}
            >
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                disabled={deleteRepo.isPending}
              >
                {deleteRepo.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
                Delete
              </Button>
            </ConfirmationDialog>
            <Button variant="outline" size="sm" className="rounded-lg" asChild>
              <a href={repo.html_url} target="_blank" rel="noreferrer">
                View repository <ArrowUpRight className="size-4" />
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      {showOverview && repo?.overview ? (
        <div className="text-muted-foreground bg-muted/20 mt-4 max-h-48 overflow-y-auto rounded-lg border p-4 text-sm leading-6 whitespace-pre-wrap">
          {repo.overview}
        </div>
      ) : null}

      {repo && !isForgejo && !repo.default_project_id ? (
        <Alert className="mt-4">
          <TriangleAlert />
          <AlertTitle>Default project required</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-x-1">
            <span>
              Choose a default project before reviewing pull requests or
              generating issue fixes.
            </span>
            <GithubAutomationSettingsDialog repo={repo}>
              <Button
                variant="link"
                className="h-auto cursor-pointer p-0 text-sm"
              >
                Choose default project
              </Button>
            </GithubAutomationSettingsDialog>
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs
        value={activeResource}
        onValueChange={(value) =>
          setActiveResource(value as "pull-requests" | "issues")
        }
        className="mt-5 w-full flex-col gap-4"
      >
        <TabsList className="bg-muted/60 h-auto self-start rounded-full border p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
          <TabsTrigger
            value="pull-requests"
            aria-pressed={activeResource === "pull-requests"}
            className="text-muted-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground flex h-7 items-center justify-center gap-2 rounded-full px-4 font-normal transition-colors aria-pressed:shadow-sm"
          >
            <GitPullRequest className="size-4" /> Pull requests
            {!pullRequestsPending ? (
              <span>{openPullRequests}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="issues"
            aria-pressed={activeResource === "issues"}
            className="text-muted-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground flex h-7 items-center justify-center gap-2 rounded-full px-4 font-normal transition-colors aria-pressed:shadow-sm"
          >
            <CircleDot className="size-4" /> Issues
            {!issuesPending ? <span>{openIssues}</span> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pull-requests">
          {pullRequestsPending ? (
            <ActivitySkeleton />
          ) : pullRequestsError ? (
            <Empty className="min-h-64 border">
              <EmptyHeader>
                <EmptyTitle>Pull requests could not be loaded</EmptyTitle>
                <EmptyDescription>
                  Refresh the page to try again.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : pullRequests.length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              {pullRequests.map((pullRequest) => (
                <PullRequestCard
                  key={pullRequest.id}
                  repoId={repoId}
                  pullRequest={pullRequest}
                  canAutomate={
                    !isForgejo && Boolean(repo?.default_project_id)
                  }
                />
              ))}
            </div>
          ) : (
            <ResourceEmpty type="pull requests" />
          )}
        </TabsContent>

        <TabsContent value="issues">
          {issuesPending ? (
            <ActivitySkeleton />
          ) : issuesError ? (
            <Empty className="min-h-64 border">
              <EmptyHeader>
                <EmptyTitle>Issues could not be loaded</EmptyTitle>
                <EmptyDescription>
                  Refresh the page to try again.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : issues.length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              {issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  repoId={repoId}
                  issue={issue}
                  canAutomate={
                    !isForgejo && Boolean(repo?.default_project_id)
                  }
                />
              ))}
            </div>
          ) : (
            <ResourceEmpty type="issues" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
