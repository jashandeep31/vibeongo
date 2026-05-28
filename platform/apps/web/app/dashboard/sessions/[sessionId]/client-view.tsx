"use client";

import axios from "axios";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  useGetProjectSessionById,
  useResumeProjectSession,
} from "@/hooks/use-project-sessions";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  CheckCircle2,
  Circle,
  Clock3,
  Play,
  Plus,
  Server,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

const formatDate = (value: unknown) => {
  if (!value) return "N/A";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
};

const formatRuntime = (value: unknown) => {
  if (!value) return "N/A";

  const startedAt = new Date(String(value));
  if (Number.isNaN(startedAt.getTime())) return "N/A";

  const totalMinutes = Math.max(
    0,
    Math.floor((Date.now() - startedAt.getTime()) / 60000),
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "< 1m";
};

const uniqueById = <T extends { id: string }>(items: T[]) => {
  const map = new Map<string, T>();

  for (const item of items) {
    map.set(item.id, item);
  }

  return Array.from(map.values());
};

const ClientView = ({ sessionId }: { sessionId: string }) => {
  const resumeSessionMutation = useResumeProjectSession();
  const [isResuming, setIsResuming] = useState(false);
  const {
    data: session,
    isLoading,
    isError,
  } = useGetProjectSessionById(sessionId);

  const runningInstances = useMemo(
    () => uniqueById(session?.instances ?? []),
    [session?.instances],
  );
  const tasks = useMemo(
    () => uniqueById(session?.tasks ?? []),
    [session?.tasks],
  );

  const handleResume = useCallback(async () => {
    setIsResuming(true);
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
      setIsResuming(false);
    }
  }, [resumeSessionMutation, sessionId]);

  if (isLoading) {
    return <div className="text-muted-foreground p-8">Loading session...</div>;
  }

  if (isError || !session) {
    return (
      <div className="p-8">
        <Card className="border-destructive/30 bg-destructive/5 text-destructive p-6">
          Failed to load session.
        </Card>
      </div>
    );
  }

  const isRunning = runningInstances.length > 0;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <Badge
              variant={isRunning ? "default" : "secondary"}
              className={
                isRunning
                  ? "border-0 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20"
                  : "border-0"
              }
            >
              {isRunning ? "Running" : "Idle"}
            </Badge>
            <span className="text-muted-foreground text-sm">
              Started {formatDate(session.started_at)}
            </span>
          </div>
          <h1 className="truncate text-3xl font-bold tracking-tight">
            {session.name}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            {session.description || "No description provided."}
          </p>
        </div>
        <Button
          className="cursor-pointer"
          variant={isRunning ? "secondary" : "default"}
          onClick={handleResume}
          disabled={isResuming}
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
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Running instances</CardDescription>
            <CardTitle className="text-3xl">
              {runningInstances.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tasks</CardDescription>
            <CardTitle className="text-3xl">{tasks.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Created</CardDescription>
            <CardTitle className="text-base">
              {formatDate(session.created_at)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Running Instances</CardTitle>
            <CardDescription>
              Active machines currently attached to this session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {runningInstances.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
                No running instances for this session.
              </div>
            ) : (
              runningInstances.map((instance) => (
                <div
                  key={instance.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Server className="text-muted-foreground h-4 w-4" />
                      <p className="font-medium">{instance.name}</p>
                    </div>
                    <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span>{instance.public_ip || "IP pending"}</span>
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatRuntime(instance.started_at)}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/projects/${session.project_id}/instances/${instance.id}`}
                    >
                      <Terminal className="h-4 w-4" />
                      Open
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>
              Work items captured for this session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
                No tasks recorded.
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="flex gap-3 rounded-lg border p-3">
                  {task.done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="text-muted-foreground mt-0.5 h-4 w-4" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm leading-5">{task.task}</p>
                    {task.folder_name ? (
                      <p className="text-muted-foreground mt-1 font-mono text-xs">
                        {task.folder_name}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Overview</CardTitle>
          <CardDescription>Saved context for this session.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-6 whitespace-pre-wrap">
            {session.overview || "No overview has been saved for this session."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientView;
