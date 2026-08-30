"use client";

import type { GetInstanceSlotsFilters, InstanceSlot } from "@repo/api-client";
import { useInstanceSlots, useUserMetadata } from "@repo/api-hooks";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
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
  CircleGauge,
  RefreshCw,
  Rows3,
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

function shortId(value: string | null) {
  return value ? value.slice(0, 8) : "—";
}

export default function LimitsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [runtime, setRuntime] = useState<RuntimeFilter>("all");
  const userQuery = useUserMetadata();
  const slotsQuery = useInstanceSlots({
    page,
    limit: PAGE_SIZE,
    status,
    category,
    runtime,
  });
  const slots = slotsQuery.data?.data ?? [];
  const currentPage = slotsQuery.data?.page ?? page;

  const updateFilter = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <CircleGauge className="size-4" />
            Capacity
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Limits &amp; slots
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
            Review instance reservations, provisioning activity, and failures
            associated with your account.
          </p>
        </div>

        <div className="min-w-44 rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Current plan
          </p>
          {userQuery.isLoading ? (
            <Skeleton className="mt-2 h-6 w-20" />
          ) : userQuery.isError ? (
            <p className="text-destructive mt-2 text-sm">Unavailable</p>
          ) : (
            <p className="mt-1 text-lg font-semibold uppercase">
              {userQuery.data?.tier ?? "—"}
            </p>
          )}
        </div>
      </header>

      <section className="mt-10">
        <div className="flex flex-col gap-4 border-y py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Rows3 className="text-muted-foreground size-4" />
            <div>
              <h2 className="text-sm font-semibold">Instance slots</h2>
              <p className="text-muted-foreground text-xs">
                Newest reservations appear first.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <NativeSelect
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

        <div className="mt-5 overflow-x-auto rounded-xl border">
          <Table className="min-w-205">
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Runtime</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Instance</TableHead>
                <TableHead className="w-48">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slotsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 6 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : slotsQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-44 text-center">
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
                    colSpan={6}
                    className="text-muted-foreground h-44 text-center"
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
                    <TableCell
                      className="font-mono text-xs"
                      title={slot.session_id ?? undefined}
                    >
                      {shortId(slot.session_id)}
                    </TableCell>
                    <TableCell
                      className="font-mono text-xs"
                      title={slot.instance_id ?? undefined}
                    >
                      {shortId(slot.instance_id)}
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

        <div className="mt-5 flex items-center justify-between">
          <p className="text-muted-foreground text-sm">Page {currentPage}</p>
          <div className="flex gap-2">
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
        </div>
      </section>
    </div>
  );
}
