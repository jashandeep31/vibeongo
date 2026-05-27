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
import { ArrowUpRight, Clock3, Play, Terminal, Server, Plus } from "lucide-react";
import { useResumeProjectSession } from "@/hooks/use-project-sessions";
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

const EmptyState = () => (
  <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
    <Clock3 className="mx-auto mb-4 h-10 w-10 opacity-50" />
    <h3 className="text-foreground text-lg font-medium">No sessions found</h3>
    <p className="mt-1 text-sm">
      Start a project session to see it listed here.
    </p>
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
  isPending: boolean;
};

const SessionCard = memo(
  ({ session, onResume, isPending }: SessionCardProps) => {
    const runningInstances = session.instances;
    const isRunning = runningInstances && runningInstances.length > 0;

    const handleResume = useCallback(() => {
      onResume(session.id);
    }, [session.id, onResume]);

    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock3 className="text-muted-foreground h-5 w-5" />
              <CardTitle className="truncate text-base" title={session.name}>
                <Link
                  href={`/dashboard/sessions/${session.id}`}
                  className="hover:text-primary focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
                >
                  {session.name}
                </Link>
              </CardTitle>
            </div>
            {isRunning ? (
              <Badge className="border-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400">
                Running
              </Badge>
            ) : (
              <Badge variant="secondary" className="border-0">
                Idle
              </Badge>
            )}
          </div>
          <CardDescription className="line-clamp-2 pt-1 text-xs">
            {session.description || "No description provided."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
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
            <div className="flex h-full items-center justify-center py-4">
              <p className="text-muted-foreground text-sm italic">
                No active instance.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="mt-auto grid gap-2 border-t px-6 py-4 pt-4 sm:grid-cols-[1fr_auto]">
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
                Resume Session
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/sessions/${session.id}`}>
              Details
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
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
};

export function ProjectSessionsList({
  sessions,
  isLoading,
  isError,
}: ProjectSessionsListProps) {
  const resumeSessionMutation = useResumeProjectSession();
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  const handleResume = useCallback(
    async (sessionId: string) => {
      setPendingSessionId(sessionId);
      const toastId = toast.loading("Launching instance...");
      try {
        await resumeSessionMutation.mutateAsync(sessionId);
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

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  if (sessions.length === 0) return <EmptyState />;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onResume={handleResume}
          isPending={pendingSessionId === session.id}
        />
      ))}
    </div>
  );
}
