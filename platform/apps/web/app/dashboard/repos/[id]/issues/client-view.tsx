"use client";

import Image from "next/image";
import Link from "next/link";
import { useGetGithubRepoById } from "@/hooks/use-github-repos";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  ArrowLeft,
  ExternalLink,
  GitPullRequest,
  MessageSquare,
} from "lucide-react";

const formatDate = (value: string | Date | null) => {
  if (!value) return "Not closed";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

const ClientView = ({ id }: { id: string }) => {
  const { data: repo, isLoading, isError } = useGetGithubRepoById(id, "issues");

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
          Failed to load repository issues.
        </div>
      </div>
    );
  }

  const issues = repo.issues ?? [];
  const openIssues = issues.filter((issue) => issue.state === "open");
  const closedIssues = issues.length - openIssues.length;

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
            {openIssues.length} open issues, {closedIssues} closed issues
          </p>
        </div>
      </div>

      {issues.length > 0 ? (
        <div className="space-y-3">
          {issues.map((issue) => {
            const labels = issue.labels ?? [];

            return (
              <div
                key={issue.id}
                className="bg-card rounded-lg border p-4 shadow-sm"
              >
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start gap-3">
                      {issue.user?.avatar_url ? (
                        <Image
                          src={issue.user.avatar_url}
                          alt={issue.user.login}
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
                              issue.state === "open"
                                ? "border-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                                : "border-0 bg-muted text-muted-foreground hover:bg-muted"
                            }
                          >
                            {issue.state}
                          </Badge>
                          <span className="text-muted-foreground text-sm">
                            #{issue.number}
                          </span>
                        </div>

                        <h2 className="mt-2 text-base font-semibold break-words">
                          {issue.title}
                        </h2>
                        {issue.body ? (
                          <p className="text-muted-foreground mt-2 line-clamp-2 text-sm break-words">
                            {issue.body}
                          </p>
                        ) : null}

                        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                          {issue.user?.login ? (
                            <span>{issue.user.login}</span>
                          ) : null}
                          <span>Opened {formatDate(issue.created_at)}</span>
                          <span>Updated {formatDate(issue.updated_at)}</span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {issue.comments}
                          </span>
                        </div>
                      </div>
                    </div>

                    {labels.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2 pl-11">
                        {labels.map((label, index) => (
                          <Badge
                            key={`${label.id ?? label.name ?? "label"}-${index}`}
                            variant="outline"
                            className="max-w-full truncate"
                          >
                            {label.name ?? "Label"}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={issue.html_url}
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
            );
          })}
        </div>
      ) : (
        <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
          No issues found for this repository.
        </div>
      )}
    </div>
  );
};

export default ClientView;
