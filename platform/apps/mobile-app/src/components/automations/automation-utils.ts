import type { ProjectAutomationRun } from "@repo/api-client";

export const AUTOMATION_SCHEDULES = [
  { id: "", label: "Manual only (no schedule)" },
  { id: "0 0 * * *", label: "Every night at midnight" },
  { id: "0 9 * * *", label: "Every day at 9:00 AM" },
  { id: "0 0 * * 0", label: "Every week on Sunday" },
] as const;

export const AUTOMATION_AGENTS = [
  { id: "build", label: "Build" },
  { id: "plan", label: "Plan" },
  { id: "issue-resolver", label: "Issue resolver" },
  { id: "pr-reviewer", label: "PR reviewer" },
] as const;

export const PROVIDER_LABELS: Record<string, string> = {
  sentry: "Sentry",
  custom: "Custom webhook",
};

export function scheduleLabel(value: string | null) {
  if (!value) return "Manual only";
  return (
    AUTOMATION_SCHEDULES.find((schedule) => schedule.id === value)?.label ??
    value
  );
}

export function formatAutomationDate(value: Date | string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function automationRunName(
  run: ProjectAutomationRun,
  automationName: string,
) {
  if (run.project_session?.name) return run.project_session.name;
  const source =
    run.source === "webhook"
      ? "Webhook"
      : run.source === "manual"
        ? "Manual"
        : "Scheduled";
  return `${automationName} — ${source} run`;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return fallback;
  }
  const response = (error as { response?: { data?: { message?: unknown } } })
    .response;
  return typeof response?.data?.message === "string"
    ? response.data.message
    : fallback;
}
