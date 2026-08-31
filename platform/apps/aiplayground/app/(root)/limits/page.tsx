"use client";

import type { GetInstanceSlotsFilters, InstanceSlot } from "@repo/api-client";
import { useInstanceSlots, useInstanceSlotUsage } from "@repo/api-hooks";
import { Alert, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { Progress } from "@repo/ui/components/progress";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

const PAGE_SIZE = 10;

type StatusFilter = NonNullable<GetInstanceSlotsFilters["status"]>;
type CategoryFilter = NonNullable<GetInstanceSlotsFilters["category"]>;
type RuntimeFilter = NonNullable<GetInstanceSlotsFilters["runtime"]>;

const statusStyles: Record<
  InstanceSlot["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  provisioning: "secondary",
  queued: "secondary",
  failed: "destructive",
  terminating: "secondary",
  terminated: "outline",
  cancelled: "outline",
  expired: "outline",
};

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">{label}</h2>
        <p className="shrink-0 text-sm font-semibold tabular-nums">
          {used} / {limit}
        </p>
      </div>
      <Progress
        className="mt-2 h-1.5"
        value={percentage}
        aria-label={`${label}: ${used} of ${limit} slots used`}
      />
    </div>
  );
}

export default function LimitsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [runtime, setRuntime] = useState<RuntimeFilter>("all");
  const usageQuery = useInstanceSlotUsage();
  const slotsQuery = useInstanceSlots({
    page,
    limit: PAGE_SIZE,
    status,
    category,
    runtime,
  });
  const slots = slotsQuery.data?.data ?? [];
  const currentPage = slotsQuery.data?.page ?? page;
  const tier = usageQuery.data?.data.tier;
  const usage = usageQuery.data?.data;
  const isLimitReached = usage
    ? (usage.manual.limit > 0 && usage.manual.used >= usage.manual.limit) ||
      (usage.auto.limit > 0 && usage.auto.used >= usage.auto.limit)
    : false;

  const updateFilter = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Limits</h1>
        {usageQuery.isLoading ? (
          <Skeleton className="h-5 w-14" />
        ) : tier ? (
          <Badge variant="outline" className="capitalize">
            {tier.replace("tier", "Tier ")}
          </Badge>
        ) : null}
      </header>

      <section className="mt-8">
        {usageQuery.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index}>
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-10" />
                </div>
                <Skeleton className="mt-2 h-1.5 w-full" />
              </div>
            ))}
          </div>
        ) : usageQuery.isError ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-destructive text-sm">
              Could not load usage limits.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void usageQuery.refetch()}
            >
              <RefreshCw />
              Try again
            </Button>
          </div>
        ) : usageQuery.data ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <UsageBar label="Manual" {...usageQuery.data.data.manual} />
            <UsageBar label="Automatic" {...usageQuery.data.data.auto} />
          </div>
        ) : null}

        {isLimitReached ? (
          <Alert className="mt-4">
            <TriangleAlert />
            <AlertTitle>
              Limit reached. Upgrade your tier to launch more. For a quick
              upgrade, email{" "}
              <a href="mailto:jashan.signup@gmail.com?subject=VibeOngo%20tier%20upgrade">
                jashan.signup@gmail.com
              </a>
              .
            </AlertTitle>
          </Alert>
        ) : null}
      </section>

      <section className="mt-8 border-t pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Slots</h2>

          <div className="flex flex-wrap gap-2">
            <NativeSelect
              size="sm"
              aria-label="Filter slots by status"
              value={status}
              onChange={(event) =>
                updateFilter(setStatus, event.target.value as StatusFilter)
              }
            >
              <NativeSelectOption value="all">All statuses</NativeSelectOption>
              <NativeSelectOption value="queued">Queued</NativeSelectOption>
              <NativeSelectOption value="provisioning">
                Provisioning
              </NativeSelectOption>
              <NativeSelectOption value="active">Active</NativeSelectOption>
              <NativeSelectOption value="failed">Failed</NativeSelectOption>
              <NativeSelectOption value="terminating">
                Terminating
              </NativeSelectOption>
              <NativeSelectOption value="terminated">
                Terminated
              </NativeSelectOption>
              <NativeSelectOption value="expired">Expired</NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              size="sm"
              aria-label="Filter slots by category"
              value={category}
              onChange={(event) =>
                updateFilter(setCategory, event.target.value as CategoryFilter)
              }
            >
              <NativeSelectOption value="all">
                All categories
              </NativeSelectOption>
              <NativeSelectOption value="manual">Manual</NativeSelectOption>
              <NativeSelectOption value="auto">Automatic</NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              size="sm"
              aria-label="Filter slots by runtime"
              value={runtime}
              onChange={(event) =>
                updateFilter(setRuntime, event.target.value as RuntimeFilter)
              }
            >
              <NativeSelectOption value="all">All runtimes</NativeSelectOption>
              <NativeSelectOption value="vm">VM</NativeSelectOption>
              <NativeSelectOption value="sandbox">Sandbox</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border">
          <Table className="min-w-140">
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Runtime</TableHead>
                <TableHead className="w-48">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slotsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 4 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : slotsQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <p className="text-destructive text-sm font-medium">
                      Could not load instance slots.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => void slotsQuery.refetch()}
                    >
                      <RefreshCw />
                      Try again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : slots.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground h-32 text-center"
                  >
                    No instance slots match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                slots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell>
                      <Badge variant={statusStyles[slot.status]}>
                        {slot.status}
                      </Badge>
                      {slot.error ? (
                        <p
                          className="text-destructive mt-1.5 max-w-52 truncate text-xs"
                          title={slot.error}
                        >
                          {slot.error}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="capitalize">
                      {slot.category}
                    </TableCell>
                    <TableCell className="uppercase">
                      {slot.runtime_kind}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDate(slot.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={slotsQuery.isFetching || currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ChevronLeft />
          </Button>
          <span className="text-muted-foreground min-w-16 text-center text-sm">
            Page {currentPage}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={slotsQuery.isFetching || !slotsQuery.data?.hasNext}
            onClick={() => setPage((value) => value + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </section>
    </div>
  );
}
