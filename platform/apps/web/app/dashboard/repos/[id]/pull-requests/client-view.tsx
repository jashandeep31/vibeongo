"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { RepoResourceSwitch } from "@/components/repo-resource-switch";
import {
  useGenerateFixForPullRequest,
  useGetGithubRepoById,
} from "@/hooks/use-github-repos";
import type { GithubRepoPullRequest } from "@/services/github-repo-services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import axios from "axios";
import { ArrowLeft, ExternalLink, GitPullRequest } from "lucide-react";
import { toast } from "sonner";

const formatDate = (value: string | Date | null) => {
  if (!value) return "Not closed";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

const PullRequestCard = ({
  repoId,
  pullRequest,
}: {
  repoId: string;
  pullRequest: GithubRepoPullRequest;
}) => {
  const router = useRouter();
  const generateFixMutation = useGenerateFixForPullRequest(
    repoId,
    pullRequest.number,
  );

  const handleGenerateFix = async () => {
    const toastId = toast.loading("Launching Instance", {
      description: "It might take a few seconds",
    });

    try {
      const res = await generateFixMutation.mutateAsync();
      toast.success("Fix generation started", { id: toastId });
      router.push(`/projects/${res.projectId}/instances/${res.instanceId}`);
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to generate fix")
        : "Failed to generate fix";
      toast.error(message, { id: toastId });
    }
  };

  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-3">
            {pullRequest.user?.avatar_url ? (
              <Image
                src={pullRequest.user.avatar_url}
                alt={pullRequest.user.login}
                width={32}
                height={32}
                className="mt-0.5 h-8 w-8 shrink-0 rounded-full"
              />
            ) : (
              <div className="bg-muted mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <GitPullRequest className="text-muted-foreground h-4 w-4" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    pullRequest.state === "open"
                      ? "border-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground hover:bg-muted border-0"
                  }
                >
                  {pullRequest.state}
                </Badge>
                {pullRequest.draft ? (
                  <Badge variant="outline">Draft</Badge>
                ) : null}
                <span className="text-muted-foreground text-sm">
                  #{pullRequest.number}
                </span>
              </div>

              <h2 className="mt-2 text-base font-semibold break-words">
                {pullRequest.title}
              </h2>
              {pullRequest.body ? (
                <p className="text-muted-foreground mt-2 line-clamp-2 text-sm break-words">
                  {pullRequest.body}
                </p>
              ) : null}

              <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                {pullRequest.user?.login ? (
                  <span>{pullRequest.user.login}</span>
                ) : null}
                <span>Opened {formatDate(pullRequest.created_at)}</span>
                <span>Updated {formatDate(pullRequest.updated_at)}</span>
                <span>
                  {pullRequest.head.ref} into {pullRequest.base.ref}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ConfirmationDialog
            title="Generate fix"
            description={`Do you want to generate a fix for pull request #${pullRequest.number}? This will start automated work for this pull request.`}
            confirmText="Generate Fix"
            onConfirm={() => {
              void handleGenerateFix();
            }}
          >
            <Button size="sm" disabled={generateFixMutation.isPending}>
              {generateFixMutation.isPending ? "Generating..." : "Generate Fix"}
            </Button>
          </ConfirmationDialog>

          <Button variant="outline" size="sm" asChild>
            <a
              href={pullRequest.html_url}
              target="_blank"
              rel="noreferrer"
              className="shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

const ClientView = ({ id }: { id: string }) => {
  const {
    data: repo,
    isLoading,
    isError,
  } = useGetGithubRepoById(id, "pull_requests");

  if (isLoading) {
    return (
      <div className="space-y-6 p-8">
        <Skeleton className="h-9 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((row) => (
            <div key={row} className="rounded-lg border p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !repo) {
    return (
      <div className="p-8">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/repos">
            <ArrowLeft className="h-4 w-4" />
            Repositories
          </Link>
        </Button>
        <div className="text-muted-foreground mt-8 rounded-lg border border-dashed p-12 text-center">
          Failed to load repository pull requests.
        </div>
      </div>
    );
  }

  const pullRequests = repo.pull_requests ?? [];
  const openPullRequests = pullRequests.filter(
    (pullRequest) => pullRequest.state === "open",
  );
  const closedPullRequests = pullRequests.length - openPullRequests.length;

  return (
    <div className="space-y-6 p-8">
      <Button variant="outline" size="sm" asChild>
        <Link href="/dashboard/repos">
          <ArrowLeft className="h-4 w-4" />
          Repositories
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight break-all">
              {repo.full_name}
            </h1>
            <Badge variant={repo.public ? "secondary" : "outline"}>
              {repo.public ? "Public" : "Private"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            {openPullRequests.length} open pull requests, {closedPullRequests}{" "}
            closed pull requests
          </p>
        </div>
      </div>

      <RepoResourceSwitch id={id} active="pull-requests" />

      {pullRequests.length > 0 ? (
        <div className="space-y-3">
          {pullRequests.map((pullRequest) => (
            <PullRequestCard
              key={pullRequest.id}
              repoId={id}
              pullRequest={pullRequest}
            />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
          No pull requests found for this repository.
        </div>
      )}
    </div>
  );
};

export default ClientView;
