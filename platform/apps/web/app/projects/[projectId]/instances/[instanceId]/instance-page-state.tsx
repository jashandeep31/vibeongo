"use client";

import Link from "next/link";
import { ArrowLeft, ServerOff } from "lucide-react";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

interface InstancePageStateProps {
  type: "loading" | "not-found" | "terminated";
  startedAt?: unknown;
  terminatedAt?: unknown;
}

const parseDate = (value: unknown) => {
  if (!value) return null;

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value: unknown) => {
  const date = parseDate(value);
  return date instanceof Date ? date.toLocaleString() : "N/A";
};

const formatDuration = (startedAt: unknown, terminatedAt: unknown) => {
  const startDate = parseDate(startedAt);
  const endDate = parseDate(terminatedAt);

  if (!(startDate instanceof Date) || !(endDate instanceof Date)) return "N/A";

  const durationMs = endDate.getTime() - startDate.getTime();
  if (durationMs < 0) return "N/A";

  const totalSeconds = Math.floor(durationMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

export function InstancePageState({
  type,
  startedAt,
  terminatedAt,
}: InstancePageStateProps) {
  if (type === "loading") {
    return <InstancePageSkeleton />;
  }

  const isTerminated = type === "terminated";

  if (isTerminated) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Instance terminated
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              This instance is no longer available.
            </p>
          </div>
          <Button variant="secondary" disabled>
            Terminated
          </Button>
        </div>

        <Card className="p-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-sm">Started At</p>
              <p className="mt-1 font-medium">{formatDate(startedAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Terminated At</p>
              <p className="mt-1 font-medium">{formatDate(terminatedAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Spun Up For</p>
              <p className="mt-1 font-medium">
                {formatDuration(startedAt, terminatedAt)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="flex min-h-56 items-center justify-center border-dashed p-6 text-center">
          <div className="flex max-w-md flex-col items-center gap-3">
            <ServerOff className="text-muted-foreground h-10 w-10" />
            <div>
              <h2 className="text-2xl font-semibold">Instance terminated</h2>
              <p className="text-muted-foreground mt-2">
                This instance has been shut down and its terminal, domains, and
                services are no longer available.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/projects">
                <ArrowLeft className="h-4 w-4" />
                Back to projects
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <Card className="flex min-h-[320px] items-center justify-center p-4 text-center md:p-8">
        <div className="flex max-w-sm flex-col items-center gap-3">
          <ServerOff className="text-muted-foreground h-8 w-8" />
          <div>
            <h1 className="text-lg font-semibold">Instance not found</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              This instance does not exist or is no longer available.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function InstancePageSkeleton() {
  return (
    <div className="space-y-12 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <Skeleton className="h-8 w-8 sm:h-9 sm:w-24" />
          <Skeleton className="h-8 w-8 sm:h-9 sm:w-16" />
          <Skeleton className="h-8 w-8 sm:h-9 sm:w-36" />
          <Skeleton className="h-8 w-8 sm:h-9 sm:w-24" />
        </div>
      </div>

      <Card className="p-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-36" />
            </div>
          ))}
        </div>
      </Card>

      <div className="bg-muted/30 grid grid-cols-2 overflow-hidden rounded-lg border">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className={index === 0 ? "min-w-0 border-r p-3" : "min-w-0 p-3"}
          >
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-10" />
            </div>
            {index === 1 && <Skeleton className="mt-1 h-3 w-28" />}
            <Skeleton className="mt-2 h-1.5 w-full" />
          </div>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-4 py-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full" />
        </div>
        <div className="p-4">
          <Skeleton className="h-40 w-full" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b px-4 py-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </div>
        <div className="bg-muted/40 border-b px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="bg-[#111111] p-1.5 sm:p-2">
          <Skeleton className="h-[55svh] min-h-[280px] w-full rounded-md sm:h-[min(70vh,720px)] sm:min-h-[420px]" />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="mt-5 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    </div>
  );
}
