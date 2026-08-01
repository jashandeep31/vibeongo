import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownRight, Loader2 } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { instances } from "@repo/db";
import { useTerminateInstance } from "@/hooks/use-instance";
import type { InstanceProject } from "@/services/instance-services";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { toast } from "sonner";

type ProjectInstance = typeof instances.$inferSelect & {
  project?: InstanceProject | null;
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
};

const formatDuration = (startedAt: unknown, terminatedAt: unknown) => {
  if (!startedAt) return "N/A";

  const startDate = new Date(String(startedAt));
  if (Number.isNaN(startDate.getTime())) return "N/A";

  const endDate = terminatedAt ? new Date(String(terminatedAt)) : new Date();
  if (Number.isNaN(endDate.getTime())) return "N/A";

  const durationMs = endDate.getTime() - startDate.getTime();
  if (durationMs < 0) return "N/A";

  const totalSeconds = Math.floor(durationMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

const formatTimeRemaining = (terminatesAt: unknown, now: Date) => {
  if (!terminatesAt) return "N/A";

  const terminatesDate = new Date(String(terminatesAt));
  if (Number.isNaN(terminatesDate.getTime())) return "N/A";

  const remainingMs = terminatesDate.getTime() - now.getTime();
  if (remainingMs <= 0) return "Expired";

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;

  return `${seconds}s`;
};

interface ProjectInstanceCardProps {
  projectId: string;
  instance: ProjectInstance;
}

export function ProjectInstanceCard({
  projectId,
  instance,
}: ProjectInstanceCardProps) {
  const { mutateAsync: terminateInstance, isPending } =
    useTerminateInstance(projectId);
  const [now, setNow] = useState(() => new Date());
  const isTerminated =
    instance.state === "terminated" || !!instance.terminated_at;
  const projectName = instance.project?.name;

  useEffect(() => {
    if (isTerminated) return;

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isTerminated]);

  const handleTerminate = async () => {
    if (isTerminated) {
      return;
    }

    const toastId = toast.loading("Terminating instance...");
    try {
      await terminateInstance(instance.id);
      toast.success("Instance terminated", { id: toastId });
    } catch {
      toast.error("Failed to terminate instance", { id: toastId });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="truncate text-xl">
              {projectName && projectId ? (
                <Link
                  href={`/projects/${projectId}`}
                  className="hover:underline"
                >
                  {projectName}
                </Link>
              ) : (
                formatValue(projectName)
              )}
            </CardTitle>
            <p className="text-muted-foreground mt-1 truncate text-xs">
              Instance: {formatValue(instance.name)}
            </p>
          </div>

          <Badge
            variant={instance.state === "running" ? "default" : "secondary"}
            className={
              instance.state === "running"
                ? "shrink-0 border-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                : "text-muted-foreground shrink-0 border-0"
            }
          >
            {formatValue(instance.state)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Spun Up For</p>
            <p className="font-medium">
              {formatDuration(instance.started_at, instance.terminated_at)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Terminates In</p>
            <p className="font-medium">
              {isTerminated
                ? "Terminated"
                : formatTimeRemaining(instance.terminates_at, now)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <ConfirmationDialog
            title="Terminate instance"
            description="Are you sure you want to terminate this instance? This action cannot be undone."
            confirmText="Terminate"
            isDestructive
            onConfirm={() => {
              void handleTerminate();
            }}
          >
            <Button
              size="sm"
              variant="destructive"
              type="button"
              disabled={isPending || isTerminated}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Terminating...
                </>
              ) : isTerminated ? (
                "Terminated"
              ) : (
                "Terminate"
              )}
            </Button>
          </ConfirmationDialog>
          {!isTerminated ? (
            <Button asChild size="sm">
              <Link href={`/projects/${projectId}/instances/${instance.id}`}>
                Interact
                <ArrowDownRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
