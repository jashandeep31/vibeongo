"use client";

import {
  useGetProjectAutomation,
  useTriggerProjectAutomation,
} from "@repo/api-hooks";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import axios from "axios";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Clock3,
  FolderCode,
  Loader2,
  Play,
} from "lucide-react";
import Link from "next/link";
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
  const automationQuery = useGetProjectAutomation(automationId);
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
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (automationQuery.isError || !automationQuery.data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link href="/automations">
            <ArrowLeft />
            Back to automations
          </Link>
        </Button>
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
  const schedule = automation.cron_expression
    ? (scheduleLabels[automation.cron_expression] ?? automation.cron_expression)
    : "Manual only";

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/automations">
          <ArrowLeft />
          Back to automations
        </Link>
      </Button>

      <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
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

      <section className="mt-10 border-y py-7">
        <h2 className="text-sm font-semibold">Details</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <CalendarClock className="size-4" /> Schedule
            </p>
            <p className="mt-2 text-sm font-medium">{schedule}</p>
          </div>
          <div>
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Clock3 className="size-4" /> Timezone
            </p>
            <p className="mt-2 text-sm font-medium">
              {automation.timezone || "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Created</p>
            <p className="mt-2 text-sm font-medium">
              {formatDate(automation.created_at)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Tasks</p>
            <p className="mt-2 text-sm font-medium">{tasks.length}</p>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div>
          <h2 className="text-sm font-semibold">Tasks</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Tasks run in the order shown below.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {tasks.map((task, index) => (
            <article key={task.id} className="rounded-xl border p-5 sm:p-6">
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

              <div className="mt-5 flex items-center gap-2 text-sm">
                <FolderCode className="text-muted-foreground size-4" />
                <code>{task.path_from_code}</code>
              </div>
              <p className="mt-4 text-sm leading-6 whitespace-pre-wrap">
                {task.task_prompt}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
