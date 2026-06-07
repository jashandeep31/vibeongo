"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useGetGithubRepos } from "@/hooks/use-github-repos";
import { useGetProjectConfigForEdit } from "@/hooks/use-project";
import { useAddTaskToProjectSession } from "@/hooks/use-project-sessions";
import type { AddTaskToProjectSessionInput } from "@/services/project-session-services";
import { Button } from "@repo/ui/components/button";
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

type TaskAgent = AddTaskToProjectSessionInput["agent"];

const taskAgents: { label: string; value: TaskAgent }[] = [
  { label: "Build", value: "build" },
  { label: "Plan", value: "plan" },
  { label: "Review", value: "reviewer" },
  { label: "Fix", value: "fixer" },
];

interface AddProjectSessionTaskDialogProps {
  sessionId: string;
  projectId: string;
}

export function AddProjectSessionTaskDialog({
  sessionId,
  projectId,
}: AddProjectSessionTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState("");
  const [model, setModel] = useState("");
  const [agent, setAgent] = useState<TaskAgent>("build");
  const [repoId, setRepoId] = useState("");
  const { mutateAsync: addTask, isPending } = useAddTaskToProjectSession();
  const { data: repos = [], isLoading: isLoadingRepos } = useGetGithubRepos();
  const { data: projectConfig, isLoading: isLoadingProjectConfig } =
    useGetProjectConfigForEdit(projectId);

  const projectRepos = useMemo(() => {
    const projectRepoIds = new Set(projectConfig?.githubRepoIds ?? []);
    return repos.filter((repo) => projectRepoIds.has(repo.id));
  }, [projectConfig?.githubRepoIds, repos]);

  const resetForm = () => {
    setTask("");
    setModel("");
    setAgent("build");
    setRepoId("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen && !isPending) resetForm();
  };

  const handleSubmit = async () => {
    const trimmedTask = task.trim();
    const trimmedModel = model.trim();

    if (!trimmedTask || !repoId) {
      toast.error("Task and repository are required");
      return;
    }

    const toastId = toast.loading("Adding task...");
    try {
      await addTask({
        id: sessionId,
        task: trimmedTask,
        model: trimmedModel || undefined,
        agent,
        repoId,
      });
      toast.success("Task added successfully", { id: toastId });
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to add task")
        : "Failed to add task";
      toast.error(message, { id: toastId });
    }
  };

  const isLoadingRepositories = isLoadingRepos || isLoadingProjectConfig;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>
            Add a new work item to this project session.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="session-task">Task</Label>
            <Textarea
              id="session-task"
              value={task}
              onChange={(event) => setTask(event.target.value)}
              placeholder="Describe the work to complete"
              className="min-h-28 resize-none"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="session-task-repository">Repository</Label>
            <Select value={repoId} onValueChange={setRepoId}>
              <SelectTrigger
                id="session-task-repository"
                className="w-full"
                disabled={isLoadingRepositories || projectRepos.length === 0}
              >
                <SelectValue
                  placeholder={
                    isLoadingRepositories
                      ? "Loading repositories..."
                      : "Select a repository"
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
            {!isLoadingRepositories && projectRepos.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                This project has no attached GitHub repositories.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="session-task-agent">Agent</Label>
              <Select
                value={agent}
                onValueChange={(value) => setAgent(value as TaskAgent)}
              >
                <SelectTrigger id="session-task-agent" className="w-full">
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
              <Label htmlFor="session-task-model">Model (optional)</Label>
              <Input
                id="session-task-model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="Model name"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={
              isPending || isLoadingRepositories || projectRepos.length === 0
            }
          >
            {isPending ? "Adding..." : "Add Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
