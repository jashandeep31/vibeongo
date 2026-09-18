"use client";

import { AutomationRunRating } from "@/components/automation-run-rating";
import { useGetProjectSession } from "@repo/api-hooks";
import type { ProjectAutomationRun } from "@repo/api-client";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { CheckCircle2, ChevronDown, ChevronUp, Circle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const providerLabels: Record<string, string> = {
  sentry: "Sentry",
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

export function AutomationRunRow({
  run,
  automation,
}: {
  run: ProjectAutomationRun;
  automation: { id: string; name: string; project_id: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const sessionId = run.project_session?.id ?? null;
  const sessionQuery = useGetProjectSession(sessionId, expanded);
  const tasks = sessionQuery.data?.data.tasks ?? [];

  return (
    <div className="bg-card hover:bg-muted/20 rounded-lg border px-4 py-3 shadow-sm transition-colors">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {run.project_session?.name ??
              `${automation.name} — ${run.source === "webhook" ? "Webhook" : run.source === "manual" ? "Manual" : "Scheduled"} run`}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {formatDate(run.created_at)}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant="secondary">{run.source}</Badge>
            {run.provider ? (
              <Badge variant="outline">
                {providerLabels[run.provider] ?? run.provider}
              </Badge>
            ) : null}
            {run.project_request_unique_id ? (
              <code
                className="text-muted-foreground text-xs"
                title={run.project_request_unique_id}
              >
                ID: {run.project_request_unique_id.slice(0, 8)}…
              </code>
            ) : null}
            <Badge
              variant={run.status === "failed" ? "destructive" : "outline"}
            >
              {run.status}
            </Badge>
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
          <AutomationRunRating
            automationId={automation.id}
            runId={run.id}
            status={run.status}
            currentRating={run.user_rating}
          />
        </div>
      </div>

      {sessionId ? (
        <div className="border-border mt-3 border-t pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            <span>Tasks</span>
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
          {expanded ? (
            <div className="pt-3">
              {sessionQuery.isLoading ? (
                <p className="text-muted-foreground text-sm">Loading tasks…</p>
              ) : sessionQuery.isError ? (
                <p className="text-destructive text-sm">
                  Tasks could not be loaded.
                </p>
              ) : tasks.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No tasks in this session.
                </p>
              ) : (
                <ul className="space-y-2">
                  {tasks.map((task, index) => (
                    <li
                      key={task.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      {task.done ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
                      ) : (
                        <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      )}
                      <span
                        className={
                          task.done ? "text-muted-foreground line-through" : ""
                        }
                      >
                        {index + 1}. {task.task}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
