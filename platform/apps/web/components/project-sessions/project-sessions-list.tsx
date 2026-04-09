"use client";

import { ProjectSessionWithRunningInstance } from "@/services/project-session-services";
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
import { Clock3, Play, Terminal, Server } from "lucide-react";
import { useResumeProjectSession } from "@/hooks/use-project-sessions";
import { toast } from "sonner";
import Link from "next/link";
import axios from "axios";

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
};

type ProjectSessionsListProps = {
  sessions: ProjectSessionWithRunningInstance[];
  isLoading: boolean;
  isError: boolean;
};

export function ProjectSessionsList({
  sessions,
  isLoading,
  isError,
}: ProjectSessionsListProps) {
  const resumeSessionMutation = useResumeProjectSession();

  const handleResume = async (sessionId: string) => {
    const toastId = toast.loading("Resuming session...");
    try {
      await resumeSessionMutation.mutateAsync(sessionId);
      toast.success("Session resumed successfully", { id: toastId });
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to resume session")
        : "Failed to resume session";
      toast.error(message, { id: toastId });
    }
  };

  if (isLoading) {
    return (
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
  }

  if (isError) {
    return (
      <div className="text-destructive rounded-lg border p-6">
        Failed to load sessions.
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
        <Clock3 className="mx-auto mb-4 h-10 w-10 opacity-50" />
        <h3 className="text-foreground text-lg font-medium">
          No sessions found
        </h3>
        <p className="mt-1 text-sm">
          Start a project session to see it listed here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map(({ session, runningInstance }) => (
        <Card key={session.id} className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock3 className="text-muted-foreground h-5 w-5" />
                <CardTitle className="truncate text-base" title={session.id}>
                  Session
                </CardTitle>
              </div>
              {runningInstance ? (
                <Badge className="border-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400">
                  Running
                </Badge>
              ) : (
                <Badge variant="secondary" className="border-0">
                  Idle
                </Badge>
              )}
            </div>
            <CardDescription className="truncate pt-1 font-mono text-xs">
              {session.id}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground mb-1 block text-xs">
                  Project ID
                </span>
                <span
                  className="block truncate font-mono"
                  title={session.project_id}
                >
                  {session.project_id}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground mb-1 block text-xs">
                  Started At
                </span>
                <span>{formatDate(session.started_at)}</span>
              </div>

              {runningInstance && (
                <div className="bg-muted/50 mt-3 rounded-md border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                      Active Instance
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground mb-0.5 block">
                        Instance ID
                      </span>
                      <span
                        className="block truncate font-mono"
                        title={runningInstance.id}
                      >
                        {runningInstance.id.slice(0, 8)}...
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground mb-0.5 block">
                        IP Address
                      </span>
                      <span className="block font-mono">
                        {runningInstance.public_ip || "Pending..."}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="mt-auto border-t px-6 py-4 pt-4">
            <div className="flex w-full gap-2">
              {runningInstance ? (
                <Button className="w-full" variant="outline" asChild>
                  <Link
                    href={`/projects/${session.project_id}/instances/${runningInstance.id}`}
                  >
                    <Terminal className="mr-2 h-4 w-4" />
                    Connect
                  </Link>
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => {
                    void handleResume(session.id);
                  }}
                  disabled={resumeSessionMutation.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Resume Session
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
