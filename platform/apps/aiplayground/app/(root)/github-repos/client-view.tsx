"use client";

import { GithubRepoDialog } from "@/components/dialogs/github-repo-dialog";
import { useGithubRepos } from "@repo/api-hooks";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/ui/components/alert";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  ArrowRight,
  Bot,
  ExternalLink,
  GitFork,
  Github,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function RepositorySkeleton() {
  return (
    <Card className="min-h-56">
      <CardHeader className="gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="h-5 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </CardContent>
    </Card>
  );
}

export default function GithubReposView() {
  const { data: repos = [], isPending, isError } = useGithubRepos();
  const [query, setQuery] = useState("");
  const filteredRepos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return repos;
    return repos.filter((repo) =>
      repo.full_name.toLowerCase().includes(normalizedQuery),
    );
  }, [query, repos]);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10 md:py-14">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Your repositories
      </h1>

      <Alert className="mt-6">
        <Github className="size-4" />
        <AlertTitle>Install the GitHub App first</AlertTitle>
        <AlertDescription>
          Install the Vibeongo GitHub App on a repository before connecting it
          here.{" "}
          <a
            href="https://github.com/apps/vibeongo/installations/new"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium"
          >
            Install GitHub App
            <ExternalLink className="size-3" />
          </a>
        </AlertDescription>
      </Alert>

      <div className="mt-7 flex items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search repositories"
            aria-label="Search repositories"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <GithubRepoDialog>
          <Button className="shrink-0 rounded-xl">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Connect repository</span>
            <span className="sm:hidden">Connect</span>
          </Button>
        </GithubRepoDialog>
      </div>

      {isPending ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <RepositorySkeleton key={item} />
          ))}
        </div>
      ) : isError ? (
        <Empty className="mt-8 min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Github />
            </EmptyMedia>
            <EmptyTitle>Repositories could not be loaded</EmptyTitle>
            <EmptyDescription>
              Check your connection and refresh the page to try again.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : filteredRepos.length === 0 ? (
        <Empty className="mt-8 min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GitFork />
            </EmptyMedia>
            <EmptyTitle>
              {repos.length === 0 ? "No repositories yet" : "No matches found"}
            </EmptyTitle>
            <EmptyDescription>
              {repos.length === 0
                ? "Connect a GitHub repository to see its pull requests and issues here."
                : "Try a different repository name."}
            </EmptyDescription>
          </EmptyHeader>
          {repos.length === 0 ? (
            <EmptyContent>
              <GithubRepoDialog>
                <Button variant="outline">Connect repository</Button>
              </GithubRepoDialog>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRepos.map((repo) => {
            const [, repoName = repo.full_name] = repo.full_name.split("/");

            return (
              <Link
                key={repo.id}
                href={`/github-repos/${repo.id}`}
                className="group focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
              >
                <Card className="group-hover:ring-foreground/20 h-full min-h-60 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                  <CardHeader className="grid-cols-[auto_1fr_auto] items-center gap-x-3">
                    <div className="bg-foreground text-background flex size-10 items-center justify-center rounded-xl shadow-sm">
                      <Github className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-muted-foreground truncate text-xs">
                        {repo.repo_owner_username}
                      </p>
                      <CardTitle className="truncate" title={repo.full_name}>
                        {repoName}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="gap-1 font-normal">
                      {repo.public ? (
                        <ShieldCheck className="size-3" />
                      ) : (
                        <LockKeyhole className="size-3" />
                      )}
                      {repo.public ? "Public" : "Private"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {!repo.default_project_id ? (
                      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                        <TriangleAlert className="size-3.5 shrink-0" />
                        Default project not configured
                      </div>
                    ) : null}
                    <p className="text-muted-foreground line-clamp-3 text-sm leading-6">
                      {repo.overview ||
                        "Pull requests and issues from this repository are ready to review."}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {repo.auto_review_pull_requests_enabled ? (
                        <Badge
                          variant="secondary"
                          className="gap-1 font-normal"
                        >
                          <Bot className="size-3" /> Auto-review
                        </Badge>
                      ) : null}
                      {repo.auto_fix_issues_enabled ? (
                        <Badge
                          variant="secondary"
                          className="gap-1 font-normal"
                        >
                          <Bot className="size-3" /> Auto-fix
                        </Badge>
                      ) : null}
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between text-sm font-medium">
                    View activity
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
