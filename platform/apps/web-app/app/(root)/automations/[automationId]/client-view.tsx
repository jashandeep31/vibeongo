"use client";

import { NoAutomationRuns } from "@/components/no-automation-runs";
import { AutomationRunRating } from "@/components/automation-run-rating";
import {
  useGetProjectAutomation,
  useGetProjectAutomationRuns,
  useTriggerProjectAutomation,
} from "@repo/api-hooks";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import axios from "axios";
import {
  AlertCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderCode,
  Loader2,
  Play,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const scheduleLabels: Record<string, string> = {
  "0 0 * * *": "Every night at midnight",
  "0 9 * * *": "Every day at 9:00 AM",
  "0 0 * * 0": "Every week on Sunday",
};

const formatDate = (value: Date | string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function AutomationDetails({
  automationId,
}: {
  automationId: string;
}) {
  const [runsPage, setRunsPage] = useState(1);
  const automationQuery = useGetProjectAutomation(automationId);
  const runsQuery = useGetProjectAutomationRuns(automationId, {
    page: runsPage,
    limit: 10,
  });
  const triggerAutomation = useTriggerProjectAutomation();

  const runAutomation = () => {
    triggerAutomation.mutate(automationId, {
      onSuccess: ({ message }) => toast.success(message),
      onError: (error) => {
        const responseMessage = axios.isAxiosError<{ message?: unknown }>(error)
          ? error.response?.data?.message
          : undefined;
        toast.error(
          typeof responseMessage === "string"
            ? responseMessage
            : "Could not trigger the automation.",
        );
      },
    });
  };

  if (automationQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-8 sm:px-8 sm:py-12">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (automationQuery.isError || !automationQuery.data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Automation could not be loaded</AlertTitle>
          <AlertDescription>
            It may have been removed, or you may not have access to it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { project_automation: automation, tasks } = automationQuery.data;
  const runs = runsQuery.data?.runs ?? [];
  const currentRunsPage = runsQuery.data?.page ?? runsPage;
  const schedule = automation.cron_expression
    ? (scheduleLabels[automation.cron_expression] ?? automation.cron_expression)
    : "Manual only";

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {automation.name}
            </h1>
            <Badge variant={automation.enabled ? "secondary" : "outline"}>
              {automation.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
            {automation.description || "No description provided."}
          </p>
        </div>
        <Button
          type="button"
          onClick={runAutomation}
          disabled={triggerAutomation.isPending}
        >
          {triggerAutomation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Play />
          )}
          {triggerAutomation.isPending ? "Starting…" : "Run now"}
        </Button>
      </header>

      <div className="text-muted-foreground mt-7 flex flex-wrap gap-x-6 gap-y-2 pb-7 text-sm">
        <span className="flex items-center gap-2">
          <CalendarClock className="size-4" /> {schedule}
        </span>
        <span className="flex items-center gap-2">
          <Clock3 className="size-4" /> {automation.timezone || "—"}
        </span>
        <span>Created {formatDate(automation.created_at)}</span>
        <span>
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>

      <section className="py-7">
        <h2 className="text-sm font-semibold">Run history</h2>

        <div className="mt-4">
          {runsQuery.isLoading ? (
            <div className="space-y-3 py-5">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : runsQuery.isError ? (
            <p className="text-destructive py-6 text-center text-sm">
              Run history could not be loaded.
            </p>
          ) : runs.length === 0 ? (
            <NoAutomationRuns />
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {run.project_session?.name ?? "Session removed"}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatDate(run.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AutomationRunRating
                      automationId={automation.id}
                      runId={run.id}
                      currentRating={run.user_rating}
                      currentFeedback={run.user_feedback}
                    />
                    {run.project_session ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={`/projects/${automation.project_id}/sessions/${run.project_session.id}`}
                        >
                          View session
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {runs.length > 0 &&
        (currentRunsPage > 1 || Boolean(runsQuery.data?.has_next)) ? (
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Previous runs page"
              disabled={runsQuery.isFetching || currentRunsPage <= 1}
              onClick={() => setRunsPage(Math.max(1, currentRunsPage - 1))}
            >
              <ChevronLeft />
            </Button>
            <span className="text-muted-foreground min-w-16 text-center text-sm">
              Page {currentRunsPage}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Next runs page"
              disabled={runsQuery.isFetching || !runsQuery.data?.has_next}
              onClick={() => setRunsPage(currentRunsPage + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        ) : null}
      </section>

      <section className="py-7">
        <h2 className="text-sm font-semibold">Tasks</h2>

        <div className="mt-4 space-y-7">
          {tasks.map((task, index) => (
            <article key={task.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="bg-muted flex size-7 items-center justify-center rounded-full text-xs font-semibold">
                    {index + 1}
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {task.agent.replaceAll("-", " ")}
                  </Badge>
                </div>
                {task.model ? (
                  <span className="text-muted-foreground font-mono text-xs">
                    {task.model}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm">
                <FolderCode className="text-muted-foreground size-4" />
                <code>{task.path_from_code}</code>
              </div>
              <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">
                {task.task_prompt}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
