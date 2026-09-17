"use client";

import {
  useCreateProjectAutomation,
  useGetProjectGithubReposById,
  useGetProjects,
} from "@repo/api-hooks";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { Textarea } from "@repo/ui/components/textarea";
import {
  projectAutomationSchema,
  projectAutomationTaskSchema,
  z,
} from "@repo/shared";
import axios from "axios";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

const agentOptions = [
  { value: "build", label: "Build" },
  { value: "plan", label: "Plan" },
  { value: "issue-resolver", label: "Issue resolver" },
  { value: "pr-reviewer", label: "PR reviewer" },
] as const;

const scheduleOptions = [
  { value: "", label: "Manual only (no schedule)" },
  { value: "0 0 * * *", label: "Every night at midnight" },
  { value: "0 9 * * *", label: "Every day at 9:00 AM" },
  { value: "0 0 * * 0", label: "Every week on Sunday" },
] as const;

type Agent = (typeof agentOptions)[number]["value"];
type TaskDraft = {
  id: number;
  pathFromCode: string;
  taskPrompt: string;
  agent: Agent;
  model: string;
};

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border border-b py-7 first:pt-0">
      <div className="max-w-2xl">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

const createAutomationSchema = projectAutomationSchema.extend({
  tasks: z.array(projectAutomationTaskSchema).min(1),
});

const newTask = (id: number): TaskDraft => ({
  id,
  pathFromCode: "",
  taskPrompt: "",
  agent: "build",
  model: "",
});

function getRepositoryPathPrefix(fullName: string) {
  return `/${fullName.split("/").at(-1) ?? fullName}`;
}

export default function CreateAutomationPage() {
  const router = useRouter();
  const projectsQuery = useGetProjects();
  const createAutomation = useCreateProjectAutomation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [cronExpression, setCronExpression] = useState<string>(
    scheduleOptions[0].value,
  );
  const [timezone, setTimezone] = useState("");
  const [tasks, setTasks] = useState<TaskDraft[]>([newTask(1)]);
  const [nextTaskId, setNextTaskId] = useState(2);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const projectReposQuery = useGetProjectGithubReposById(projectId || null);

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const projects = projectsQuery.data ?? [];
  const repositoryPathPrefixes = (projectReposQuery.data ?? []).map((repo) =>
    getRepositoryPathPrefix(repo.full_name),
  );
  const isSubmitDisabled =
    createAutomation.isPending ||
    projectsQuery.isLoading ||
    projectsQuery.isError ||
    projects.length === 0 ||
    !timezone;

  const updateTask = (id: number, patch: Partial<TaskDraft>) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, ...patch } : task,
      ),
    );
  };

  const addTask = () => {
    setTasks((currentTasks) => [...currentTasks, newTask(nextTaskId)]);
    setNextTaskId((currentId) => currentId + 1);
  };

  const removeTask = (id: number) => {
    setTasks((currentTasks) =>
      currentTasks.length === 1
        ? currentTasks
        : currentTasks.filter((task) => task.id !== id),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!projects.some((project) => project.id === projectId)) {
      setErrorMessage("Select a project for this automation.");
      return;
    }

    if (!scheduleOptions.some((option) => option.value === cronExpression)) {
      setErrorMessage("Select a schedule for this automation.");
      return;
    }

    if (!timezone) {
      setErrorMessage(
        "Your timezone could not be detected. Refresh and try again.",
      );
      return;
    }

    const parsed = createAutomationSchema.safeParse({
      name: name.trim(),
      description: description.trim() || undefined,
      project_id: projectId,
      cron_expression: cronExpression.trim(),
      timezone,
      tasks: tasks.map((task, index) => ({
        path_from_code: task.pathFromCode.trim(),
        task_prompt: task.taskPrompt.trim(),
        agent: task.agent,
        order_number: index + 1,
        model: task.model.trim() || undefined,
      })),
    });

    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Check the automation details.",
      );
      return;
    }

    try {
      await createAutomation.mutateAsync(parsed.data);
      toast.success("Automation created");
      router.push("/automations");
    } catch (error) {
      const responseMessage = axios.isAxiosError<{ message?: unknown }>(error)
        ? error.response?.data?.message
        : undefined;
      setErrorMessage(
        typeof responseMessage === "string"
          ? responseMessage
          : "Could not create the automation. Try again.",
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/automations">
          <ArrowLeft />
          Back to automations
        </Link>
      </Button>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create automation
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Run one or more agent tasks on a recurring schedule.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="[&_[data-slot=input]]:border-foreground/25 [&_[data-slot=native-select]]:border-foreground/25 [&_[data-slot=textarea]]:border-foreground/25 dark:[&_[data-slot=input]]:border-foreground/30 dark:[&_[data-slot=native-select]]:border-foreground/30 dark:[&_[data-slot=textarea]]:border-foreground/30 mt-8"
      >
        <FormSection
          title="Automation details"
          description="Choose the project and describe what this automation does."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="automation-name">Name</Label>
              <Input
                id="automation-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Weekly review"
                minLength={2}
                maxLength={20}
                autoFocus
                disabled={createAutomation.isPending}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="automation-project">Project</Label>
              <NativeSelect
                id="automation-project"
                className="w-full"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                disabled={projectsQuery.isLoading || createAutomation.isPending}
                required
              >
                <NativeSelectOption value="">
                  {projectsQuery.isLoading
                    ? "Loading projects…"
                    : "Select a project"}
                </NativeSelectOption>
                {projects.map((project) => (
                  <NativeSelectOption key={project.id} value={project.id}>
                    {project.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {projectsQuery.isError ? (
                <p className="text-destructive text-xs">
                  Projects could not be loaded. Refresh and try again.
                </p>
              ) : projects.length === 0 && !projectsQuery.isLoading ? (
                <p className="text-muted-foreground text-xs">
                  Create a project before creating an automation.
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="automation-description">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="automation-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should this automation accomplish?"
              maxLength={200}
              className="min-h-24 resize-y"
              disabled={createAutomation.isPending}
            />
            <p className="text-muted-foreground text-xs">
              {description.length}/200 characters.
            </p>
          </div>
        </FormSection>

        <FormSection
          title="Schedule"
          description="Choose how often this automation should run."
        >
          <div className="grid max-w-xl gap-2">
            <Label htmlFor="automation-schedule">Schedule</Label>
            <NativeSelect
              id="automation-schedule"
              className="w-full"
              value={cronExpression}
              onChange={(event) => setCronExpression(event.target.value)}
              disabled={createAutomation.isPending}
            >
              {scheduleOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <p className="text-muted-foreground text-xs">
              {cronExpression
                ? "The automation will repeat automatically on this schedule."
                : "This automation will only run when started manually."}
            </p>
            <p className="text-muted-foreground text-xs">
              Timezone: {timezone || "Detecting your timezone…"}
            </p>
          </div>
        </FormSection>

        <FormSection
          title="Tasks"
          description="Tasks run in the order shown. At least one task is required."
        >
          <div className="space-y-5">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className="border-border bg-muted/10 rounded-xl border p-5 sm:p-6"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Task {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeTask(task.id)}
                    disabled={tasks.length === 1 || createAutomation.isPending}
                  >
                    <Trash2 />
                    Remove
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`task-path-${task.id}`}>
                      Path from code dir
                    </Label>
                    <Input
                      id={`task-path-${task.id}`}
                      value={task.pathFromCode}
                      onChange={(event) =>
                        updateTask(task.id, {
                          pathFromCode: event.target.value,
                        })
                      }
                      placeholder="/repository-name/src/components"
                      minLength={2}
                      maxLength={100}
                      disabled={createAutomation.isPending}
                      required
                    />
                    {projectId && projectReposQuery.isLoading ? (
                      <p className="text-muted-foreground text-xs">
                        Loading repository paths…
                      </p>
                    ) : repositoryPathPrefixes.length > 0 ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {repositoryPathPrefixes.map((prefix) => (
                            <Button
                              key={prefix}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 font-mono text-xs"
                              onClick={() =>
                                updateTask(task.id, { pathFromCode: prefix })
                              }
                              disabled={createAutomation.isPending}
                            >
                              {prefix}
                            </Button>
                          ))}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          Start with a repository path, then add any path before
                          or after it.
                        </p>
                        {task.pathFromCode.trim() &&
                        !repositoryPathPrefixes.some((prefix) =>
                          task.pathFromCode.trim().startsWith(prefix),
                        ) ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Please check this path. It does not start with one
                            of this project&apos;s repositories.
                          </p>
                        ) : null}
                      </>
                    ) : projectId && !projectReposQuery.isError ? (
                      <p className="text-muted-foreground text-xs">
                        This project has no attached repositories.
                      </p>
                    ) : projectReposQuery.isError ? (
                      <p className="text-destructive text-xs">
                        Repository paths could not be loaded.
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`task-prompt-${task.id}`}>
                      Task prompt
                    </Label>
                    <Textarea
                      id={`task-prompt-${task.id}`}
                      value={task.taskPrompt}
                      onChange={(event) =>
                        updateTask(task.id, {
                          taskPrompt: event.target.value,
                        })
                      }
                      placeholder="Review this area and propose improvements."
                      minLength={2}
                      maxLength={500}
                      className="min-h-24 resize-y"
                      disabled={createAutomation.isPending}
                      required
                    />
                    <p className="text-muted-foreground text-xs">
                      {task.taskPrompt.length}/500 characters.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`task-agent-${task.id}`}>Agent</Label>
                      <NativeSelect
                        id={`task-agent-${task.id}`}
                        className="w-full"
                        value={task.agent}
                        onChange={(event) =>
                          updateTask(task.id, {
                            agent: event.target.value as Agent,
                          })
                        }
                        disabled={createAutomation.isPending}
                      >
                        {agentOptions.map((agent) => (
                          <NativeSelectOption
                            key={agent.value}
                            value={agent.value}
                          >
                            {agent.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`task-model-${task.id}`}>
                        Model{" "}
                        <span className="text-muted-foreground">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id={`task-model-${task.id}`}
                        value={task.model}
                        onChange={(event) =>
                          updateTask(task.id, { model: event.target.value })
                        }
                        placeholder="e.g. gpt-5.2"
                        minLength={2}
                        maxLength={100}
                        disabled={createAutomation.isPending}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addTask}
              disabled={createAutomation.isPending || tasks.length >= 100}
            >
              <Plus />
              Add task
            </Button>
          </div>
        </FormSection>

        {errorMessage ? (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            asChild
            type="button"
            variant="outline"
            disabled={createAutomation.isPending}
          >
            <Link href="/automations">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitDisabled}>
            {createAutomation.isPending ? "Creating…" : "Create automation"}
          </Button>
        </div>
      </form>
    </div>
  );
}
