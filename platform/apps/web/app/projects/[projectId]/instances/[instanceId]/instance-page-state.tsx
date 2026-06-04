"use client";

import { ServerOff } from "lucide-react";

import { Card } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";

interface InstancePageStateProps {
  type: "loading" | "not-found";
}

export function InstancePageState({ type }: InstancePageStateProps) {
  if (type === "loading") {
    return <InstancePageSkeleton />;
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
