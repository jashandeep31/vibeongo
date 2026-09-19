"use client";

import { RotateProjectAutomationTriggerDialog } from "@/components/dialogs/rotate-project-automation-trigger-dialog";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { AutomationRunRow } from "@/components/automation-run-row";
import {
  useDeleteProjectAutomationTrigger,
  useGetProjectAutomation,
  useGetProjectAutomationTrigger,
} from "@repo/api-hooks";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import axios from "axios";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  FolderCode,
  Trash2,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const formatDate = (value: Date | string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function TriggerDetails({
  automationId,
  triggerId,
}: {
  automationId: string;
  triggerId: string;
}) {
  const [page, setPage] = useState(1);
  const router = useRouter();
  const automationQuery = useGetProjectAutomation(automationId);
  const triggerQuery = useGetProjectAutomationTrigger(automationId, triggerId, {
    page,
    limit: 10,
  });
  const deleteTrigger = useDeleteProjectAutomationTrigger();

  if (automationQuery.isLoading || triggerQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-8 sm:px-8 sm:py-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (
    automationQuery.isError ||
    !automationQuery.data ||
    triggerQuery.isError ||
    !triggerQuery.data
  ) {
    const message = axios.isAxiosError<{ message?: unknown }>(
      triggerQuery.error,
    )
      ? triggerQuery.error.response?.data?.message
      : undefined;

    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Integration could not be loaded</AlertTitle>
          <AlertDescription>
            {typeof message === "string"
              ? message
              : "It may have been removed, or you may not have access to it."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const {
    trigger,
    runs,
    has_next: hasNext,
    page: currentPage,
  } = triggerQuery.data;
  const automation = automationQuery.data.project_automation;

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(trigger.webhook_url);
      toast.success("Webhook URL copied");
    } catch {
      toast.error("Could not copy the webhook URL");
    }
  };

  const handleDelete = () => {
    deleteTrigger.mutate(
      { automationId, triggerId },
      {
        onSuccess: ({ message }) => {
          toast.success(message);
          router.push(`/automations/${automationId}`);
        },
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

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/automations/${automationId}`}>
          <ChevronLeft /> Back to automation
        </Link>
      </Button>

      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Webhook className="text-muted-foreground size-5" />
            <h1 className="text-2xl font-semibold tracking-tight">
              {trigger.name}
            </h1>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Integration for {automation.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Webhook</Badge>
          <RotateProjectAutomationTriggerDialog
            automationId={automationId}
            triggerId={trigger.id}
            triggerName={trigger.name}
          >
            <Button type="button" variant="outline">
              Rotate token
            </Button>
          </RotateProjectAutomationTriggerDialog>
          <ConfirmationDialog
            title="Delete integration?"
            description="This will disable the webhook and stop it from accepting new events."
            confirmText="Delete integration"
            isDestructive
            onConfirm={handleDelete}
          >
            <Button
              type="button"
              variant="outline"
              disabled={deleteTrigger.isPending}
            >
              <Trash2 /> Delete
            </Button>
          </ConfirmationDialog>
        </div>
      </header>

      <section className="mt-8 rounded-xl border p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <Calendar className="text-muted-foreground mt-0.5 size-4" />
            <div>
              <p className="text-muted-foreground text-xs">Created</p>
              <p className="mt-1 text-sm">{formatDate(trigger.created_at)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Webhook className="text-muted-foreground mt-0.5 size-4" />
            <div>
              <p className="text-muted-foreground text-xs">Last triggered</p>
              <p className="mt-1 text-sm">
                {formatDate(trigger.lasted_triggered_at)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FolderCode className="text-muted-foreground mt-0.5 size-4" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Automation</p>
              <Link
                href={`/automations/${automationId}`}
                className="mt-1 block truncate text-sm underline-offset-4 hover:underline"
              >
                {automation.name}
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <code className="bg-muted text-muted-foreground min-w-0 flex-1 overflow-x-auto rounded px-3 py-2 text-xs">
            {trigger.webhook_url}
          </code>
          <Button type="button" variant="outline" onClick={copyWebhookUrl}>
            <Clipboard /> Copy URL
          </Button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Trigger runs</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Requests received by this integration.
        </p>

        <div className="mt-4 space-y-3">
          {runs.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              No runs have been received yet.
            </p>
          ) : (
            runs.map((run) => (
              <AutomationRunRow
                key={run.id}
                run={run}
                automation={automation}
              />
            ))
          )}
        </div>

        {runs.length > 0 && (currentPage > 1 || hasNext) ? (
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Previous trigger runs page"
              disabled={triggerQuery.isFetching || currentPage <= 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
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
              aria-label="Next trigger runs page"
              disabled={triggerQuery.isFetching || !hasNext}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
