import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, Check, Copy, Loader2 } from "lucide-react";
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

const formatDate = (value: unknown) => {
  if (!value) return "N/A";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
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
  const [copied, setCopied] = useState(false);
  const copyResetTimerRef = useRef<number | null>(null);
  const isTerminated =
    instance.state === "terminated" || !!instance.terminated_at;

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const handleCopyPublicIp = async () => {
    const publicIp = instance.public_ip;

    if (!publicIp) {
      return;
    }

    try {
      await navigator.clipboard.writeText(String(publicIp));
      setCopied(true);

      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      copyResetTimerRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">
            {instance.project?.name ?? instance.name}
          </CardTitle>

          <div className="flex items-center gap-3">
            <Badge
              variant={instance.state === "running" ? "default" : "secondary"}
              className={
                instance.state === "running"
                  ? "border-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                  : "text-muted-foreground border-0"
              }
            >
              {formatValue(instance.state)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Public IP</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="font-medium">{formatValue(instance.public_ip)}</p>
              <Button
                size="sm"
                type="button"
                variant="outline"
                aria-label="Copy IPv4 address"
                onClick={() => {
                  void handleCopyPublicIp();
                }}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Started At</p>
            <p className="font-medium">{formatDate(instance.started_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Terminated At</p>
            <p className="font-medium">{formatDate(instance.terminated_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Spun Up For</p>
            <p className="font-medium">
              {formatDuration(instance.started_at, instance.terminated_at)}
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
