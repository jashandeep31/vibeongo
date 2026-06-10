"use client";

import axios from "axios";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AddProjectSessionTaskDialog } from "@/components/dialogs/add-project-session-task-dialog";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { EditProjectSessionTaskDialog } from "@/components/dialogs/edit-project-session-task-dialog";
import { useTerminateInstance } from "@/hooks/use-instance";
import {
  useDeleteProjectSessionTask,
  useGetProjectSessionById,
  useResumeProjectSession,
} from "@/hooks/use-project-sessions";
import type { ProjectSessionDetails } from "@/services/project-session-services";
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
  FolderIcon,
  Loader2,
  Pencil,
  Play,
  Plus,
  Server,
  Terminal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

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

type ProjectSessionTask = ProjectSessionDetails["tasks"][number];

const SessionTask = ({
  task,
  sessionId,
  projectId,
}: {
  task: ProjectSessionTask;
  sessionId: string;
  projectId: string;
}) => {
  const deleteTaskMutation = useDeleteProjectSessionTask();

  const handleDelete = async () => {
    const toastId = toast.loading("Deleting task...");
    try {
      await deleteTaskMutation.mutateAsync({
        id: sessionId,
        taskId: task.id,
      });
      toast.success("Task deleted successfully", { id: toastId });
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to delete task")
        : "Failed to delete task";
      toast.error(message, { id: toastId });
    }
  };

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 gap-3">
        {task.done ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <Circle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm leading-5">{task.task.slice(0, 100)}</p>
          {task.folder_name ? (
            <div className="flex items-center gap-1">
              <FolderIcon className="text-muted-foreground h-3 w-3" />
              <p className="text-muted-foreground mt-1 font-mono text-xs">
                {task.folder_name}
              </p>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <EditProjectSessionTaskDialog
          task={task}
          sessionId={sessionId}
          projectId={projectId}
        >
          <Button variant="ghost" size="icon" aria-label="Edit task">
            <Pencil className="h-4 w-4" />
          </Button>
        </EditProjectSessionTaskDialog>
        <ConfirmationDialog
          title="Delete task"
          description="Are you sure you want to delete this task? This action cannot be undone."
          confirmText="Delete"
          isDestructive
          onConfirm={() => {
            void handleDelete();
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete task"
            disabled={deleteTaskMutation.isPending}
          >
            {deleteTaskMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="text-destructive h-4 w-4" />
            )}
          </Button>
        </ConfirmationDialog>
      </div>
    </div>
  );
};

const SessionTasks = ({
  tasks,
  sessionId,
  projectId,
}: {
  tasks: ProjectSessionTask[];
  sessionId: string;
  projectId: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Tasks</CardTitle>
      <CardDescription>Work items captured for this session.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {tasks.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center md:p-8">
          No tasks recorded.
        </div>
      ) : (
        tasks.map((task) => (
          <SessionTask
            key={task.id}
            task={task}
            sessionId={sessionId}
            projectId={projectId}
          />
        ))
      )}
      <AddProjectSessionTaskDialog
        sessionId={sessionId}
        projectId={projectId}
      />
    </CardContent>
  </Card>
);

const ClientView = ({ sessionId }: { sessionId: string }) => {
  const resumeSessionMutation = useResumeProjectSession();
  const [isResuming, setIsResuming] = useState(false);
  const {
    data: session,
    isLoading,
    isError,
  } = useGetProjectSessionById(sessionId);
  const terminateInstanceMutation = useTerminateInstance(
    session?.project_id ?? "",
    sessionId,
  );

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

  const handleTerminate = useCallback(
    async (instanceId: string) => {
      const toastId = toast.loading("Terminating instance...");
      try {
        await terminateInstanceMutation.mutateAsync(instanceId);
        toast.success("Instance terminated", { id: toastId });
      } catch (error: unknown) {
        console.error(error);
        const message = axios.isAxiosError<{ message?: string }>(error)
          ? (error.response?.data?.message ?? "Failed to terminate instance")
          : "Failed to terminate instance";
        toast.error(message, { id: toastId });
      }
    },
    [terminateInstanceMutation],
  );

  if (isLoading) {
    return (
      <div className="text-muted-foreground p-4 md:p-8">Loading session...</div>
    );
  }

  if (isError || !session) {
    return (
      <div className="p-4 md:p-8">
        <Card className="border-destructive/30 bg-destructive/5 text-destructive p-6">
          Failed to load session.
        </Card>
      </div>
    );
  }

  const isRunning = runningInstances.length > 0;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
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
              <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center md:p-8">
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
                  <div className="flex items-center gap-2">
                    <ConfirmationDialog
                      title="Terminate instance"
                      description="Are you sure you want to terminate this instance? This action cannot be undone."
                      confirmText="Terminate"
                      isDestructive
                      onConfirm={() => {
                        void handleTerminate(instance.id);
                      }}
                    >
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={
                          terminateInstanceMutation.isPending &&
                          terminateInstanceMutation.variables === instance.id
                        }
                      >
                        {terminateInstanceMutation.isPending &&
                        terminateInstanceMutation.variables === instance.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Terminate
                      </Button>
                    </ConfirmationDialog>
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/projects/${session.project_id}/instances/${instance.id}`}
                      >
                        <Terminal className="h-4 w-4" />
                        Open
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <SessionTasks
          tasks={tasks}
          sessionId={sessionId}
          projectId={session.project_id}
        />
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
