"use client";

import { GithubAutomationSettingsDialog } from "@/components/dialogs/github-automation-settings-dialog";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import {
  useDeleteGithubRepo,
  useGenerateFixForIssue,
  useGenerateReviewForPullRequest,
  useGithubRepoIssues,
  useGithubRepoPullRequests,
  useScheduleGithubRepoOverview,
} from "@repo/api-hooks";
import type { GithubRepoIssue, GithubRepoPullRequest } from "@repo/api-client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
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
  ArrowLeft,
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
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <Card key={item} className="py-5">
          <CardContent className="flex gap-4">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="w-full space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatusBadge({ state, merged }: { state: string; merged?: boolean }) {
  const label = merged ? "Merged" : state === "open" ? "Open" : "Closed";
  const tone = merged
    ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
    : state === "open"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : "bg-muted text-muted-foreground";

  return <Badge className={`border-0 font-medium ${tone}`}>{label}</Badge>;
}

function Author({ user }: { user?: { login: string; avatar_url: string } }) {
  return (
    <Avatar className="mt-0.5 size-9">
      {user?.avatar_url ? (
        <AvatarImage src={user.avatar_url} alt={user.login} />
      ) : null}
      <AvatarFallback>
        {user?.login?.slice(0, 2).toUpperCase() ?? "GH"}
      </AvatarFallback>
    </Avatar>
  );
}

function PullRequestCard({
  repoId,
  pullRequest,
  canAutomate,
}: {
  repoId: string;
  pullRequest: GithubRepoPullRequest;
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
      size="sm"
      className="cursor-pointer disabled:cursor-not-allowed"
      disabled={!canAutomate || generateReview.isPending}
    >
      {generateReview.isPending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Sparkles />
      )}
      Review
    </Button>
  );

  return (
    <Card className="py-5 transition-shadow hover:shadow-md">
      <CardContent className="flex min-w-0 gap-4">
        <Author user={pullRequest.user} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  state={pullRequest.state}
                  merged={Boolean(pullRequest.merged_at)}
                />
                {pullRequest.draft ? (
                  <Badge variant="outline">Draft</Badge>
                ) : null}
                <span className="text-muted-foreground text-xs font-medium">
                  #{pullRequest.number}
                </span>
              </div>
              <h2 className="mt-2 text-base leading-6 font-semibold">
                {pullRequest.title}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1 self-start">
              {canAutomate ? (
                <ConfirmationDialog
                  title="Review pull request"
                  description={`Start an AI review for pull request #${pullRequest.number}?`}
                  confirmText="Start review"
                  onConfirm={() => void handleReview()}
                >
                  {reviewButton}
                </ConfirmationDialog>
              ) : (
                reviewButton
              )}
              <Button variant="ghost" size="sm" asChild>
                <a href={pullRequest.html_url} target="_blank" rel="noreferrer">
                  Open on GitHub <ArrowUpRight className="size-4" />
                </a>
              </Button>
            </div>
          </div>
          {pullRequest.body ? (
            <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-6">
              {pullRequest.body}
            </p>
          ) : null}
          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span>{pullRequest.user?.login ?? "Unknown author"}</span>
            <span>{formatDate(pullRequest.created_at)}</span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <GitBranch className="size-3.5 shrink-0" />
              <span className="max-w-36 truncate">{pullRequest.head.ref}</span>
              <span>→</span>
              <span className="max-w-36 truncate">{pullRequest.base.ref}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IssueCard({
  repoId,
  issue,
  canAutomate,
}: {
  repoId: string;
  issue: GithubRepoIssue;
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
      size="sm"
      className="cursor-pointer disabled:cursor-not-allowed"
      disabled={!canAutomate || generateFix.isPending}
    >
      {generateFix.isPending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <WandSparkles />
      )}
      Generate fix
    </Button>
  );

  return (
    <Card className="py-5 transition-shadow hover:shadow-md">
      <CardContent className="flex min-w-0 gap-4">
        <Author user={issue.user} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge state={issue.state} />
                <span className="text-muted-foreground text-xs font-medium">
                  #{issue.number}
                </span>
              </div>
              <h2 className="mt-2 text-base leading-6 font-semibold">
                {issue.title}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1 self-start">
              {canAutomate ? (
                <ConfirmationDialog
                  title="Generate issue fix"
                  description={`Start an AI fix for issue #${issue.number}?`}
                  confirmText="Generate fix"
                  onConfirm={() => void handleGenerateFix()}
                >
                  {generateFixButton}
                </ConfirmationDialog>
              ) : (
                generateFixButton
              )}
              <Button variant="ghost" size="sm" asChild>
                <a href={issue.html_url} target="_blank" rel="noreferrer">
                  Open on GitHub <ArrowUpRight className="size-4" />
                </a>
              </Button>
            </div>
          </div>
          {issue.body ? (
            <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-6">
              {issue.body}
            </p>
          ) : null}
          {issue.labels.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {issue.labels.map((label, index) => (
                <Badge
                  key={`${label.id ?? label.name ?? "label"}-${index}`}
                  variant="outline"
                  className="max-w-48 truncate font-normal"
                >
                  {label.name ?? "Label"}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span>{issue.user?.login ?? "Unknown author"}</span>
            <span>{formatDate(issue.created_at)}</span>
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="size-3.5" /> {issue.comments}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
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
  const issuesQuery = useGithubRepoIssues(repoId);
  const pullRequestsQuery = useGithubRepoPullRequests(repoId);
  const repo = pullRequestsQuery.data ?? issuesQuery.data;
  const isForgejo = repo?.type === "forgejo";
  const issues = issuesQuery.data?.issues ?? [];
  const pullRequests = pullRequestsQuery.data?.pull_requests ?? [];
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
      router.push("/github-repos");
    } catch (error: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to delete repository")
        : "Failed to delete repository";
      toast.error(message, { id: toastId });
    }
  };

  if (issuesQuery.isError && pullRequestsQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-10 md:px-10">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/github-repos">
            <ArrowLeft /> Repositories
          </Link>
        </Button>
        <Empty className="mt-8 min-h-72 border">
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
    <div className="mx-auto w-full max-w-6xl px-5 py-10 md:px-10 md:py-14">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link href="/github-repos">
          <ArrowLeft className="size-4" /> Repositories
        </Link>
      </Button>

      <div className="mt-6 flex flex-col gap-5 border-b pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {repo ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-foreground text-background flex size-11 items-center justify-center rounded-xl">
                  {isForgejo ? (
                    <GitFork className="size-5" />
                  ) : (
                    <Github className="size-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-sm">
                    {repo.repo_owner_username}
                  </p>
                  <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
                    {repo.full_name.split("/").at(-1)}
                  </h1>
                </div>
                <Badge variant="secondary" className="gap-1 font-normal">
                  {isForgejo ? (
                    <GitFork className="size-3" />
                  ) : (
                    <Github className="size-3" />
                  )}
                  {isForgejo ? "Forgejo" : "GitHub"}
                </Badge>
                <Badge variant="outline" className="gap-1 font-normal">
                  {repo.public ? (
                    <ShieldCheck className="size-3" />
                  ) : (
                    <LockKeyhole className="size-3" />
                  )}
                  {repo.public ? "Public" : "Private"}
                </Badge>
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
                className="rounded-xl"
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
                  className="cursor-pointer rounded-xl"
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
                className="cursor-pointer rounded-xl"
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
              <Button variant="outline" className="rounded-xl">
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
                className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl"
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
            <Button variant="outline" className="rounded-xl" asChild>
              <a
                href={`https://github.com/${repo.full_name}`}
                target="_blank"
                rel="noreferrer"
              >
                View repository <ArrowUpRight className="size-4" />
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      {showOverview && repo?.overview ? (
        <div className="text-muted-foreground bg-muted/20 mt-6 max-h-64 overflow-y-auto rounded-xl border p-5 text-sm leading-6 whitespace-pre-wrap">
          {repo.overview}
        </div>
      ) : null}

      {repo && !repo.default_project_id ? (
        <Alert className="mt-6">
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
        className="mt-8 w-full flex-col gap-6"
      >
        <TabsList className="bg-muted/60 h-auto self-start rounded-full border p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
          <TabsTrigger
            value="pull-requests"
            aria-pressed={activeResource === "pull-requests"}
            className="text-muted-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground flex h-7 items-center justify-center gap-2 rounded-full px-4 font-normal transition-colors aria-pressed:shadow-sm"
          >
            <GitPullRequest className="size-4" /> Pull requests
            {!pullRequestsQuery.isPending ? (
              <span>{openPullRequests}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="issues"
            aria-pressed={activeResource === "issues"}
            className="text-muted-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground flex h-7 items-center justify-center gap-2 rounded-full px-4 font-normal transition-colors aria-pressed:shadow-sm"
          >
            <CircleDot className="size-4" /> Issues
            {!issuesQuery.isPending ? <span>{openIssues}</span> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pull-requests">
          {pullRequestsQuery.isPending ? (
            <ActivitySkeleton />
          ) : pullRequestsQuery.isError ? (
            <Empty className="min-h-64 border">
              <EmptyHeader>
                <EmptyTitle>Pull requests could not be loaded</EmptyTitle>
                <EmptyDescription>
                  Refresh the page to try again.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : pullRequests.length > 0 ? (
            <div className="space-y-3">
              {pullRequests.map((pullRequest) => (
                <PullRequestCard
                  key={pullRequest.id}
                  repoId={repoId}
                  pullRequest={pullRequest}
                  canAutomate={Boolean(repo?.default_project_id)}
                />
              ))}
            </div>
          ) : (
            <ResourceEmpty type="pull requests" />
          )}
        </TabsContent>

        <TabsContent value="issues">
          {issuesQuery.isPending ? (
            <ActivitySkeleton />
          ) : issuesQuery.isError ? (
            <Empty className="min-h-64 border">
              <EmptyHeader>
                <EmptyTitle>Issues could not be loaded</EmptyTitle>
                <EmptyDescription>
                  Refresh the page to try again.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : issues.length > 0 ? (
            <div className="space-y-3">
              {issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  repoId={repoId}
                  issue={issue}
                  canAutomate={Boolean(repo?.default_project_id)}
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
