import { useConfigStore } from "@/store/config-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { CircleAlert } from "lucide-react";

export const PROJECT_CONFIG_ERRORS_ID = "project-config-errors";

export const scrollToProjectConfigErrors = () => {
  requestAnimationFrame(() => {
    const errorCard = document.getElementById(PROJECT_CONFIG_ERRORS_ID);
    errorCard?.focus({ preventScroll: true });
    errorCard?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
};

export default function ProjectConfigErrors() {
  const errors = useConfigStore((state) => state.submissionErrors);

  if (!errors.length) return null;
  const hasServerError = errors.some((error) => error.source === "server");

  return (
    <Card
      id={PROJECT_CONFIG_ERRORS_ID}
      tabIndex={-1}
      role="alert"
      aria-live="polite"
      className="border-destructive/30 bg-destructive/5 text-destructive ring-destructive/20 gap-3"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleAlert className="size-5 shrink-0" />
          {hasServerError
            ? "Project could not be submitted"
            : errors.length === 1
              ? "Fix this error before submitting"
              : `Fix these ${errors.length} errors before submitting`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {errors.map((error) => (
            <li key={error.id}>{error.message}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
