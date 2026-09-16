"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useGetGithubRepos } from "@/hooks/use-github-repos";
import { useGetProjectConfigForEdit } from "@/hooks/use-project";
import { useUpdateProjectSessionTask } from "@/hooks/use-project-sessions";
import type {
  ProjectSessionDetails,
  UpdateProjectSessionTaskInput,
} from "@/services/project-session-services";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Textarea } from "@repo/ui/components/textarea";
import { toast } from "sonner";

type ProjectSessionTask = ProjectSessionDetails["tasks"][number];
type TaskAgent = UpdateProjectSessionTaskInput["agent"];

const taskAgents: { label: string; value: TaskAgent }[] = [
  { label: "Build", value: "build" },
  { label: "Plan", value: "plan" },
  { label: "PR Reviewer", value: "pr-reviewer" },
  { label: "Issue Resolver", value: "issue-resolver" },
];

interface EditProjectSessionTaskDialogProps {
  task: ProjectSessionTask;
  sessionId: string;
  projectId: string;
  children: ReactNode;
}

export function EditProjectSessionTaskDialog({
  task: initialTask,
  sessionId,
  projectId,
  children,
}: EditProjectSessionTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState(initialTask.task ?? "");
  const [model, setModel] = useState(initialTask.model ?? "");
  const [agent, setAgent] = useState<TaskAgent>(initialTask.agent);
  const [repoId, setRepoId] = useState("");
  const [done, setDone] = useState(initialTask.done);
  const { mutateAsync: updateTask, isPending } =
    useUpdateProjectSessionTask();
  const { data: repos = [], isLoading: isLoadingRepos } = useGetGithubRepos();
  const { data: projectConfig, isLoading: isLoadingProjectConfig } =
    useGetProjectConfigForEdit(projectId);

  const projectRepos = useMemo(() => {
    const projectRepoIds = new Set(projectConfig?.githubRepoIds ?? []);
    return repos.filter((repo) => projectRepoIds.has(repo.id));
  }, [projectConfig?.githubRepoIds, repos]);

  const currentRepoId = useMemo(
    () =>
      projectRepos.find(
        (repo) => repo.full_name.split("/").at(-1) === initialTask.folder_name,
      )?.id ?? "",
    [initialTask.folder_name, projectRepos],
  );

  const resetForm = () => {
    setTask(initialTask.task ?? "");
    setModel(initialTask.model ?? "");
    setAgent(initialTask.agent);
    setRepoId(currentRepoId);
    setDone(initialTask.done);
  };

  useEffect(() => {
    if (open && !repoId && currentRepoId) {
      setRepoId(currentRepoId);
    }
  }, [currentRepoId, open, repoId]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) resetForm();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTask = task?.trim() ?? "";
    const trimmedModel = model?.trim() ?? "";
    if (!trimmedTask) {
      toast.error("Task is required");
      return;
    }
    if (!repoId) {
      toast.error("Repository is required");
      return;
    }

    const toastId = toast.loading("Updating task...");
    try {
      await updateTask({
        id: sessionId,
        taskId: initialTask.id,
        task: trimmedTask,
        model: trimmedModel,
        agent,
        repoId,
        done,
      });
      toast.success("Task updated successfully", { id: toastId });
      setOpen(false);
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to update task")
        : "Failed to update task";
      toast.error(message, { id: toastId });
    }
  };

  const isLoadingRepositories = isLoadingRepos || isLoadingProjectConfig;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update this project session work item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor={`session-task-${initialTask.id}`}>Task</Label>
              <Textarea
                id={`session-task-${initialTask.id}`}
                value={task}
                onChange={(event) => setTask(event.target.value)}
                className="min-h-28 resize-none"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`session-task-repository-${initialTask.id}`}>
                Repository
              </Label>
              <Select value={repoId} onValueChange={setRepoId}>
                <SelectTrigger
                  id={`session-task-repository-${initialTask.id}`}
                  className="w-full"
                  disabled={isLoadingRepositories || projectRepos.length === 0}
                >
                  <SelectValue
                    placeholder={
                      isLoadingRepositories
                        ? "Loading repositories..."
                        : initialTask.folder_name || "Select a repository"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {projectRepos.map((repo) => (
                    <SelectItem key={repo.id} value={repo.id}>
                      {repo.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`session-task-agent-${initialTask.id}`}>
                  Agent
                </Label>
                <Select
                  value={agent}
                  onValueChange={(value) => setAgent(value as TaskAgent)}
                >
                  <SelectTrigger
                    id={`session-task-agent-${initialTask.id}`}
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskAgents.map((taskAgent) => (
                      <SelectItem key={taskAgent.value} value={taskAgent.value}>
                        {taskAgent.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`session-task-model-${initialTask.id}`}>
                  Model (optional)
                </Label>
                <Input
                  id={`session-task-model-${initialTask.id}`}
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  placeholder="Model name"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id={`session-task-done-${initialTask.id}`}
                checked={done}
                onCheckedChange={(checked) => setDone(checked === true)}
              />
              <Label htmlFor={`session-task-done-${initialTask.id}`}>
                Mark task as completed
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || isLoadingRepositories || !repoId}
            >
              {isPending ? "Updating..." : "Update Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
