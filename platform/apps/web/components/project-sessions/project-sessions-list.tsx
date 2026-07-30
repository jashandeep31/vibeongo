"use client";

import { ProjectSessionWithRunningInstances } from "@/services/project-session-services";
import { Badge } from "@repo/ui/components/badge";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@repo/ui/components/card";
import {
  ArrowUpRight,
  Clock3,
  Play,
  Terminal,
  Server,
  Plus,
  Archive,
  RotateCcw,
  FolderKanban,
} from "lucide-react";
import {
  useArchiveProjectSession,
  useResumeProjectSession,
} from "@/hooks/use-project-sessions";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import {
  ProjectSessionRuntimeDialog,
  type ProjectSessionRuntime,
} from "@/components/dialogs/project-session-runtime-dialog";
import { toast } from "sonner";
import Link from "next/link";
import axios from "axios";
import { useState, useCallback, memo } from "react";

const formatDuration = (startedAt: unknown) => {
  if (!startedAt) return "N/A";

  const startDate = new Date(String(startedAt));
  if (Number.isNaN(startDate.getTime())) return "N/A";

  const endDate = new Date();
  const durationMs = endDate.getTime() - startDate.getTime();
  if (durationMs < 0) return "N/A";

  const totalSeconds = Math.floor(durationMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return "< 1m";
};

const LoadingState = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3].map((row) => (
      <Card key={row}>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    ))}
  </div>
);

const ErrorState = () => (
  <div className="text-destructive rounded-lg border p-6">
    Failed to load sessions.
  </div>
);

type EmptyStateProps = {
  title?: string;
  description?: string;
};

const EmptyState = ({
  title = "No sessions found",
  description = "Start a project session to see it listed here.",
}: EmptyStateProps) => (
  <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
    <Clock3 className="mx-auto mb-4 h-10 w-10 opacity-50" />
    <h3 className="text-foreground text-lg font-medium">{title}</h3>
    <p className="mt-1 text-sm">{description}</p>
  </div>
);

type InstanceType = ProjectSessionWithRunningInstances["instances"][number];

type RunningInstanceProps = {
  instance: InstanceType;
  projectId: string;
};

const RunningInstanceCard = memo(
  ({ instance, projectId }: RunningInstanceProps) => {
    return (
      <div className="bg-muted/50 rounded-md border p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Active Instance
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
            <Link href={`/projects/${projectId}/instances/${instance.id}`}>
              <Terminal className="mr-1 h-3 w-3" />
              Connect
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground mb-0.5 block">
              IP Address
            </span>
            <span className="block font-mono">
              {instance.public_ip || "Pending..."}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground mb-0.5 block">
              Spun Up For
            </span>
            <span className="block font-mono">
              {formatDuration(instance.started_at)}
            </span>
          </div>
        </div>
      </div>
    );
  },
);

RunningInstanceCard.displayName = "RunningInstanceCard";

type SessionCardProps = {
  session: ProjectSessionWithRunningInstances;
  onResume: (sessionId: string) => void;
  onArchive: (sessionId: string) => void;
  isPending: boolean;
  isArchiving: boolean;
  isArchivedView: boolean;
  showProjectName: boolean;
};

const SessionCard = memo(
  ({
    session,
    onResume,
    onArchive,
    isPending,
    isArchiving,
    isArchivedView,
    showProjectName,
  }: SessionCardProps) => {
    const runningInstances = session.instances;
    const isRunning = runningInstances && runningInstances.length > 0;

    const handleResume = useCallback(() => {
      onResume(session.id);
    }, [session.id, onResume]);

    const handleArchive = useCallback(() => {
      onArchive(session.id);
    }, [session.id, onArchive]);

    return (
      <Card className="relative flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-foreground/20">
        <CardHeader className="gap-3 px-5 pt-2 pb-0">
          {showProjectName && (
            <Link
              href={`/projects/${session.project_id}`}
              className="bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex w-fit max-w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs outline-none transition-colors focus-visible:ring-2"
            >
              <FolderKanban className="text-primary h-3.5 w-3.5 shrink-0" />
              <span className="shrink-0 text-[10px] font-semibold tracking-wider uppercase">
                Project
              </span>
              <span className="text-border">/</span>
              <span className="truncate font-medium">{session.project_name}</span>
            </Link>
          )}

          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <Clock3 className="h-4.5 w-4.5" />
              </div>
              <CardTitle
                className="min-w-0 truncate text-base font-semibold sm:text-lg"
                title={session.name}
              >
                <Link
                  href={`/dashboard/sessions/${session.id}`}
                  className="hover:text-primary focus-visible:ring-ring block truncate rounded-sm outline-none focus-visible:ring-2"
                >
                  {session.name}
                </Link>
              </CardTitle>
            </div>
            {isRunning ? (
              <Badge className="shrink-0 gap-1.5 border-0 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Running
              </Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0 gap-1.5 border-0">
                <span className="bg-muted-foreground/60 h-1.5 w-1.5 rounded-full" />
                Idle
              </Badge>
            )}
          </div>
          <CardDescription className="line-clamp-2 text-sm leading-relaxed">
            {session.description || "No description provided."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 px-5 pb-1">
          {isRunning ? (
            <div className="space-y-3">
              {runningInstances.map((instance) => (
                <RunningInstanceCard
                  key={instance.id}
                  instance={instance}
                  projectId={session.project_id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-muted/25 flex items-center gap-3 rounded-lg border border-dashed px-4 py-3">
              <div className="bg-background text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-foreground/10">
                <Server className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Ready to resume</p>
                <p className="text-muted-foreground text-xs">
                  No instance is currently running.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="mt-auto grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 px-5 py-4">
          <Button
            className="w-full cursor-pointer"
            variant={isRunning ? "secondary" : "default"}
            onClick={handleResume}
            disabled={isPending}
          >
            {isRunning ? (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Launch Another Instance
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </>
            )}
          </Button>
          <Button variant="outline" size="icon" aria-label="View details" asChild>
            <Link href={`/dashboard/sessions/${session.id}`}>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <ConfirmationDialog
            title={isArchivedView ? "Restore session" : "Archive session"}
            description={
              isArchivedView
                ? `Restore "${session.name}" to your active sessions list?`
                : `Archive "${session.name}"? It will be hidden from your active sessions list.`
            }
            confirmText={isArchivedView ? "Restore" : "Archive"}
            onConfirm={handleArchive}
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={isArchivedView ? "Restore session" : "Archive session"}
              disabled={isArchiving}
            >
              {isArchivedView ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </Button>
          </ConfirmationDialog>
        </CardFooter>
      </Card>
    );
  },
);

SessionCard.displayName = "SessionCard";

type ProjectSessionsListProps = {
  sessions: ProjectSessionWithRunningInstances[];
  isLoading: boolean;
  isError: boolean;
  isArchivedView?: boolean;
  showProjectName?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function ProjectSessionsList({
  sessions,
  isLoading,
  isError,
  isArchivedView = false,
  showProjectName = false,
  emptyTitle,
  emptyDescription,
}: ProjectSessionsListProps) {
  const resumeSessionMutation = useResumeProjectSession();
  const archiveSessionMutation = useArchiveProjectSession();
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [runtimeDialogSessionId, setRuntimeDialogSessionId] =
    useState<string | null>(null);
  const [archivingSessionId, setArchivingSessionId] = useState<string | null>(
    null,
  );

  const handleResume = useCallback(
    async (sessionId: string, runtime: ProjectSessionRuntime) => {
      setPendingSessionId(sessionId);
      const toastId = toast.loading("Launching instance...");
      try {
        await resumeSessionMutation.mutateAsync({ id: sessionId, runtime });
        toast.success("Instance launched successfully", { id: toastId });
      } catch (error: unknown) {
        console.error(error);
        const message = axios.isAxiosError<{ message?: string }>(error)
          ? (error.response?.data?.message ?? "Failed to launch instance")
          : "Failed to launch instance";
        toast.error(message, { id: toastId });
      } finally {
        setPendingSessionId(null);
      }
    },
    [resumeSessionMutation],
  );

  const handleResumeRequest = useCallback((sessionId: string) => {
    setRuntimeDialogSessionId(sessionId);
  }, []);

  const handleRuntimeSelect = useCallback(
    (runtime: ProjectSessionRuntime) => {
      if (!runtimeDialogSessionId) return;
      const sessionId = runtimeDialogSessionId;
      setRuntimeDialogSessionId(null);
      void handleResume(sessionId, runtime);
    },
    [handleResume, runtimeDialogSessionId],
  );

  const handleArchive = useCallback(
    async (sessionId: string) => {
      setArchivingSessionId(sessionId);
      const action = !isArchivedView;
      const toastId = toast.loading(
        action ? "Archiving session..." : "Restoring session...",
      );
      try {
        await archiveSessionMutation.mutateAsync({ id: sessionId, action });
        toast.success(
          action
            ? "Session archived successfully"
            : "Session restored successfully",
          { id: toastId },
        );
      } catch (error: unknown) {
        console.error(error);
        const message = axios.isAxiosError<{ message?: string }>(error)
          ? (error.response?.data?.message ??
            (action ? "Failed to archive session" : "Failed to restore session"))
          : action
            ? "Failed to archive session"
            : "Failed to restore session";
        toast.error(message, { id: toastId });
      } finally {
        setArchivingSessionId(null);
      }
    },
    [archiveSessionMutation, isArchivedView],
  );

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  if (sessions.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onResume={handleResumeRequest}
          onArchive={handleArchive}
          isPending={pendingSessionId === session.id}
          isArchiving={archivingSessionId === session.id}
          isArchivedView={isArchivedView}
          showProjectName={showProjectName}
        />
      ))}
      <ProjectSessionRuntimeDialog
        open={runtimeDialogSessionId !== null}
        onOpenChange={(open) => {
          if (!open) setRuntimeDialogSessionId(null);
        }}
        onSelect={handleRuntimeSelect}
      />
    </div>
  );
}
