"use client";

import { NoAutomationRuns } from "@/components/no-automation-runs";
import { AutomationRunRow } from "@/components/automation-run-row";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { CreateProjectAutomationTriggerDialog } from "@/components/dialogs/create-project-automation-trigger-dialog";
import { RotateProjectAutomationTriggerDialog } from "@/components/dialogs/rotate-project-automation-trigger-dialog";
import {
  useDeleteProjectAutomation,
  useDeleteProjectAutomationTrigger,
  useGetProjectAutomation,
  useGetProjectAutomationRuns,
  useGetProjectAutomationTriggers,
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
  Copy,
  FolderCode,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const scheduleLabels: Record<string, string> = {
  "0 0 * * *": "Every night at midnight",
  "0 9 * * *": "Every day at 9:00 AM",
  "0 0 * * 0": "Every week on Sunday",
};

const providerLabels: Record<string, string> = {
  sentry: "Sentry",
  custom: "Custom webhook",
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
  const router = useRouter();
  const [runsPage, setRunsPage] = useState(1);
  const automationQuery = useGetProjectAutomation(automationId);
  const runsQuery = useGetProjectAutomationRuns(automationId, {
    page: runsPage,
    limit: 10,
  });
  const triggersQuery = useGetProjectAutomationTriggers(automationId);
  const triggerAutomation = useTriggerProjectAutomation();
  const deleteAutomation = useDeleteProjectAutomation();
  const deleteTrigger = useDeleteProjectAutomationTrigger();

  const handleDelete = () => {
    deleteAutomation.mutate(automationId, {
      onSuccess: ({ message }) => {
        toast.success(message);
        router.push("/automations");
      },
      onError: (error) => {
        const responseMessage = axios.isAxiosError<{ message?: unknown }>(error)
          ? error.response?.data?.message
          : undefined;
        toast.error(
          typeof responseMessage === "string"
            ? responseMessage
            : "Could not delete the automation.",
        );
      },
    });
  };

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

  const handleDeleteTrigger = (triggerId: string) => {
    deleteTrigger.mutate(
      { automationId: automation.id, triggerId },
      {
        onSuccess: ({ message }) => toast.success(message),
        onError: (error) => {
          const responseMessage = axios.isAxiosError<{ message?: unknown }>(
            error,
          )
            ? error.response?.data?.message
            : undefined;
          toast.error(
            typeof responseMessage === "string"
              ? responseMessage
              : "Could not delete the integration.",
          );
        },
      },
    );
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
  const triggers = triggersQuery.data?.triggers ?? [];
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
        <div className="flex items-center gap-2">
          <ConfirmationDialog
            title="Delete automation?"
            description="This automation will no longer appear in your automations and cannot be restored."
            confirmText="Delete automation"
            isDestructive
            onConfirm={handleDelete}
          >
            <Button
              type="button"
              variant="outline"
              disabled={deleteAutomation.isPending}
            >
              {deleteAutomation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              Delete
            </Button>
          </ConfirmationDialog>
          <Button asChild variant="outline">
            <Link href={`/automations/${automation.id}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
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
        </div>
      </header>

      <div className="text-muted-foreground mt-7 flex flex-wrap gap-x-6 gap-y-2 pb-7 text-sm">
        <span className="flex items-center gap-2">
          <CalendarClock className="size-4" /> {schedule}
        </span>
        <span className="flex items-center gap-2">
          <FolderCode className="size-4" /> {automation.project_name}
        </span>
        <span>
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>

      <section className="border-border border-b py-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Integrations</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Webhooks that can trigger this automation.
            </p>
          </div>
          <CreateProjectAutomationTriggerDialog automationId={automation.id}>
            <Button type="button" variant="outline" size="sm">
              <Webhook /> Add integration
            </Button>
          </CreateProjectAutomationTriggerDialog>
        </div>

        <div className="mt-4 space-y-3">
          {triggersQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : triggersQuery.isError ? (
            <p className="text-destructive text-sm">
              Integrations could not be loaded.
            </p>
          ) : triggers.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-5 text-sm">
              No integrations have been created yet.
            </p>
          ) : (
            triggers.map((trigger) => (
              <div
                key={trigger.id}
                className="bg-card rounded-lg border px-4 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <Link
                      href={`/automations/${automation.id}/triggers/${trigger.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {trigger.name}
                    </Link>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Created {formatDate(trigger.created_at)} · Last triggered{" "}
                      {formatDate(trigger.lasted_triggered_at)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline">
                        {providerLabels[trigger.provider] ?? trigger.provider}
                      </Badge>
                      <code
                        className="text-muted-foreground"
                        title={trigger.id}
                      >
                        ID: {trigger.id.slice(0, 8)}…
                      </code>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(trigger.webhook_url);
                        toast.success("Webhook URL copied");
                      }}
                    >
                      <Copy /> Copy URL
                    </Button>
                    <RotateProjectAutomationTriggerDialog
                      automationId={automation.id}
                      triggerId={trigger.id}
                      triggerName={trigger.name}
                    >
                      <Button type="button" variant="ghost" size="sm">
                        <RefreshCw /> Rotate token
                      </Button>
                    </RotateProjectAutomationTriggerDialog>
                    <ConfirmationDialog
                      title="Delete integration?"
                      description="This will disable the webhook and stop it from accepting new events."
                      confirmText="Delete integration"
                      isDestructive
                      onConfirm={() => handleDeleteTrigger(trigger.id)}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deleteTrigger.isPending}
                      >
                        <Trash2 /> Delete
                      </Button>
                    </ConfirmationDialog>
                  </div>
                </div>
                <code className="bg-muted text-muted-foreground mt-3 block overflow-x-auto rounded px-2 py-1.5 text-xs">
                  {trigger.webhook_url}
                </code>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="py-7">
        <h2 className="text-sm font-semibold">Tasks</h2>

        <div className="mt-4 space-y-7">
          {tasks.map((task, index) => (
            <article key={task.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bg-muted flex size-7 items-center justify-center rounded-full text-xs font-semibold">
                    {index + 1}
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {task.agent.replaceAll("-", " ")}
                  </Badge>
                  <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-sm">
                    <FolderCode className="size-4 shrink-0" />
                    <code className="truncate">{task.path_from_code}</code>
                  </div>
                </div>
                {task.model ? (
                  <span className="text-muted-foreground font-mono text-xs">
                    {task.model}
                  </span>
                ) : null}
              </div>

              <p className="text-muted-foreground mt-3 pl-10 text-sm leading-6 whitespace-pre-wrap">
                {task.task_prompt}
              </p>
            </article>
          ))}
        </div>
      </section>

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
                <AutomationRunRow
                  key={run.id}
                  run={run}
                  automation={automation}
                />
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
    </div>
  );
}
