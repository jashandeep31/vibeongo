"use client";

import { useMemo, useState } from "react";
import { useCreateInstance } from "@/hooks/use-instance";
import { useGetGithubRepos } from "@/hooks/use-github-repos";
import { useGetProjectConfigForEdit } from "@/hooks/use-project";
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
import { toast } from "sonner";
import { createInstanceSchema } from "@repo/shared";
import axios from "axios";
import { Plus, Trash2 } from "lucide-react";

type TaskAgent = "build" | "plan" | "reviewer" | "fixer";
type TaskDraft = {
  id: string;
  task: string;
  model: string;
  agent: TaskAgent;
  repoId: string;
};

const taskAgents: { label: string; value: TaskAgent }[] = [
  { label: "Build", value: "build" },
  { label: "Plan", value: "plan" },
  { label: "Review", value: "reviewer" },
  { label: "Fix", value: "fixer" },
];

const createTaskDraft = (): TaskDraft => ({
  id: crypto.randomUUID(),
  task: "",
  model: "",
  agent: "build",
  repoId: "",
});

interface CreateInstanceDialogProps {
  projectId: string;
  projectName: string;
  onSuccess?: () => void;
}

export function CreateInstanceDialog({
  projectId,
  projectName,
  onSuccess,
}: CreateInstanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [sessionDescription, setSessionDescription] = useState("");
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const { mutateAsync: createInstance, isPending } = useCreateInstance();
  const { data: repos = [], isLoading: isLoadingRepos } = useGetGithubRepos();
  const { data: projectConfig, isLoading: isLoadingProjectConfig } =
    useGetProjectConfigForEdit(projectId);

  const projectRepos = useMemo(() => {
    const projectRepoIds = new Set(projectConfig?.githubRepoIds ?? []);
    return repos.filter((repo) => projectRepoIds.has(repo.id));
  }, [projectConfig?.githubRepoIds, repos]);

  const isLoadingRepositories = isLoadingRepos || isLoadingProjectConfig;

  const resetForm = () => {
    setSessionName("");
    setSessionDescription("");
    setTasks([]);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen && !isPending) {
      resetForm();
    }
  };

  const updateTask = (id: string, updates: Partial<TaskDraft>) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task,
      ),
    );
  };

  const handleCreate = async () => {
    const parsedData = createInstanceSchema.safeParse({
      projectId,
      sessionName: sessionName.trim(),
      sessionDescription: sessionDescription.trim() || undefined,
      tasks: tasks.map(({ task, model, agent, repoId }) => ({
        task: task.trim(),
        model: model.trim() || undefined,
        agent,
        repoId,
      })),
    });

    if (!parsedData.success) {
      toast.error(parsedData.error.issues[0]?.message ?? "Invalid data");
      return;
    }

    const toastId = toast.loading("Creating new instance and session...");
    try {
      await createInstance(parsedData.data);
      toast.success("Instance created successfully", { id: toastId });
      setOpen(false);
      resetForm();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to create instance")
        : "Failed to create instance";
      toast.error(message, { id: toastId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Create Instance</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Instance</DialogTitle>
          <DialogDescription>
            This will start a new session. Provide a name and description to
            help you identify this session later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="sessionName">Session Name</Label>
            <Input
              id="sessionName"
              placeholder={`e.g., ${projectName} Session`}
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              minLength={4}
            />
            {sessionName.length > 0 && sessionName.trim().length < 4 && (
              <span className="text-destructive text-xs">
                Must be at least 4 characters
              </span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sessionDescription">Description (Optional)</Label>
            <Textarea
              id="sessionDescription"
              placeholder="What are you working on in this session?"
              value={sessionDescription}
              onChange={(e) => setSessionDescription(e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Label>Tasks (Optional)</Label>
                <p className="text-muted-foreground mt-1 text-xs">
                  Add work items that should be available when the session
                  starts.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  isPending ||
                  isLoadingRepositories ||
                  projectRepos.length === 0
                }
                onClick={() => {
                  setTasks((currentTasks) => [
                    ...currentTasks,
                    createTaskDraft(),
                  ]);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </div>

            {!isLoadingRepositories && projectRepos.length === 0 ? (
              <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                This project has no attached GitHub repositories. You can still
                create the instance without tasks.
              </p>
            ) : null}

            {tasks.map((task, index) => (
              <div key={task.id} className="grid gap-4 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Task {index + 1}</p>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove task ${index + 1}`}
                    disabled={isPending}
                    onClick={() => {
                      setTasks((currentTasks) =>
                        currentTasks.filter(
                          (currentTask) => currentTask.id !== task.id,
                        ),
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`task-${task.id}`}>Task</Label>
                  <Textarea
                    id={`task-${task.id}`}
                    value={task.task}
                    onChange={(event) => {
                      updateTask(task.id, { task: event.target.value });
                    }}
                    placeholder="Describe the work to complete"
                    className="min-h-24 resize-none"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`task-repository-${task.id}`}>
                    Repository
                  </Label>
                  <Select
                    value={task.repoId}
                    onValueChange={(repoId) => {
                      updateTask(task.id, { repoId });
                    }}
                  >
                    <SelectTrigger
                      id={`task-repository-${task.id}`}
                      className="w-full"
                      disabled={isLoadingRepositories}
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
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`task-agent-${task.id}`}>Agent</Label>
                    <Select
                      value={task.agent}
                      onValueChange={(agent) => {
                        updateTask(task.id, {
                          agent: agent as TaskAgent,
                        });
                      }}
                    >
                      <SelectTrigger
                        id={`task-agent-${task.id}`}
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {taskAgents.map((taskAgent) => (
                          <SelectItem
                            key={taskAgent.value}
                            value={taskAgent.value}
                          >
                            {taskAgent.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`task-model-${task.id}`}>
                      Model (Optional)
                    </Label>
                    <Input
                      id={`task-model-${task.id}`}
                      value={task.model}
                      onChange={(event) => {
                        updateTask(task.id, { model: event.target.value });
                      }}
                      placeholder="Model name"
                    />
                  </div>
                </div>
              </div>
            ))}
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
            onClick={() => void handleCreate()}
            disabled={isPending}
          >
            {isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
