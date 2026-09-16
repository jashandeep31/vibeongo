"use client";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { GithubAutomationSettingsDialog } from "@/components/dialogs/github-automation-settings-dialog";
import MarkdownRenderer from "@/components/markdown-renderer";
import type { GitRepoIssue, GitRepoPullRequest } from "@repo/api-client";
import {
  useGenerateFixForIssue,
  useGenerateReviewForPullRequest,
  useGitRepoActivityDetails,
  useGitRepoById,
} from "@repo/api-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import axios from "axios";
import {
  ArrowUpRight,
  CircleDot,
  GitBranch,
  GitPullRequest,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function GitRepoActivityDetailsView({
  repoId,
  type,
  number,
}: {
  repoId: string;
  type: "pr" | "issue";
  number: number;
}) {
  const repoQuery = useGitRepoById(repoId);
  const detailsQuery = useGitRepoActivityDetails(repoId, type, number);
  const generateReview = useGenerateReviewForPullRequest(repoId, number);
  const generateFix = useGenerateFixForIssue(repoId, number);
  const repo = repoQuery.data;
  const item = detailsQuery.data;
  const isIssue = type === "issue";
  const issue = isIssue ? (item as GitRepoIssue | undefined) : undefined;
  const pullRequest = !isIssue
    ? (item as GitRepoPullRequest | undefined)
    : undefined;
  const providerName = repo?.type === "forgejo" ? "Forgejo" : "GitHub";
  const canAutomate = repo?.type === "github" && Boolean(repo.default_project_id);
  const automationPending = generateFix.isPending || generateReview.isPending;
  const automationLabel = isIssue ? "Fix with AI" : "Review with AI";

  const runAutomation = async () => {
    const toastId = toast.loading(
      isIssue ? "Starting issue fix..." : "Starting pull request review...",
    );
    try {
      if (isIssue) await generateFix.mutateAsync();
      else await generateReview.mutateAsync();
      toast.success(isIssue ? "AI fix started" : "AI review started", {
        id: toastId,
      });
    } catch (error: unknown) {
      const fallback = isIssue
        ? "Failed to start issue fix"
        : "Failed to start review";
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? fallback)
        : fallback;
      toast.error(message, { id: toastId });
    }
  };

  if (repoQuery.isPending || detailsQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-8 h-9 w-3/4" />
        <Skeleton className="mt-4 h-6 w-80 max-w-full" />
        <Skeleton className="mt-8 h-64 w-full" />
      </div>
    );
  }

  if (repoQuery.isError || detailsQuery.isError || !repo || !item) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-5xl flex-col items-center justify-center px-5 text-center">
        {isIssue ? <CircleDot className="size-8" /> : <GitPullRequest className="size-8" />}
        <h1 className="mt-4 text-xl font-semibold">
          {isIssue ? "Issue" : "Pull request"} could not be loaded
        </h1>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => void detailsQuery.refetch()}
        >
          <RefreshCw /> Try again
        </Button>
      </div>
    );
  }

  const isMerged = Boolean(pullRequest?.merged_at);
  const stateLabel = isMerged
    ? "Merged"
    : item.state === "open"
      ? "Open"
      : "Closed";
  const automationButton = (
    <Button
      size="sm"
      disabled={!canAutomate || automationPending}
      title={
        repo.type !== "github"
          ? "AI actions are currently available for GitHub repositories"
          : !repo.default_project_id
            ? "Choose a default project to use AI actions"
            : automationLabel
      }
    >
      {!repo.default_project_id ? (
        <TriangleAlert className="text-amber-500" />
      ) : automationPending ? (
        <Loader2 className="animate-spin" />
      ) : isIssue ? (
        <WandSparkles />
      ) : (
        <Sparkles />
      )}
      {automationLabel}
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 md:px-10 md:py-8">
      <header className="border-b pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{repo.full_name}</p>
            <h1 className="mt-1 text-2xl leading-tight font-semibold tracking-tight md:text-3xl">
              {item.title}{" "}
              <span className="text-muted-foreground font-normal">#{item.number}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {canAutomate ? (
              <ConfirmationDialog
                title={isIssue ? "Generate issue fix" : "Review pull request"}
                description={
                  isIssue
                    ? `Start an AI fix for issue #${number}?`
                    : `Start an AI review for pull request #${number}?`
                }
                confirmText={isIssue ? "Generate fix" : "Start review"}
                onConfirm={() => void runAutomation()}
              >
                {automationButton}
              </ConfirmationDialog>
            ) : (
              automationButton
            )}
            {!repo.default_project_id ? (
              <GithubAutomationSettingsDialog repo={repo}>
                <Button variant="outline" size="sm">
                  Set up default project
                </Button>
              </GithubAutomationSettingsDialog>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <a href={item.html_url} target="_blank" rel="noreferrer">
                Open on {providerName} <ArrowUpRight />
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <Badge
            className={
              isMerged
                ? "border-0 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                : item.state === "open"
                  ? "border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-0"
            }
          >
            {isIssue ? <CircleDot /> : <GitPullRequest />} {stateLabel}
          </Badge>
          {pullRequest?.draft ? <Badge variant="outline">Draft</Badge> : null}
          {item.user ? (
            <>
              <Avatar className="ml-1 size-6">
                <AvatarImage src={item.user.avatar_url} alt={item.user.login} />
                <AvatarFallback>{item.user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{item.user.login}</span>
            </>
          ) : null}
          <span className="text-muted-foreground">
            opened on {formatDate(item.created_at)}
          </span>
          {issue && issue.comments > 0 ? (
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <MessageSquare className="size-3.5" /> {issue.comments}
            </span>
          ) : null}
        </div>
      </header>

      {pullRequest?.head.ref && pullRequest.base.ref ? (
        <div className="bg-muted/40 mt-6 flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <GitBranch className="text-muted-foreground size-4" />
          <code>{pullRequest.head.ref}</code>
          <span className="text-muted-foreground">into</span>
          <code>{pullRequest.base.ref}</code>
        </div>
      ) : null}

      {issue && issue.labels.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {issue.labels.map((label, index) => (
            <Badge key={`${label.id ?? label.name ?? "label"}-${index}`} variant="outline">
              {label.name ?? "Label"}
            </Badge>
          ))}
        </div>
      ) : null}

      <section className="mt-5 min-h-48 rounded-lg border px-5 py-5">
        {item.body ? (
          <MarkdownRenderer content={item.body} />
        ) : (
          <p className="text-muted-foreground text-sm">No description was provided.</p>
        )}
      </section>

      <p className="text-muted-foreground mt-4 text-xs">
        Last updated {formatDate(item.updated_at)}
      </p>
    </div>
  );
}
