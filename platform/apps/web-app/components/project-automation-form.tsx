"use client";

import { useGetProjectGithubReposById, useGetProjects } from "@repo/api-hooks";
import type { CreateProjectAutomationInput } from "@repo/api-client";
import {
  projectAutomationSchema,
  projectAutomationTaskSchema,
  z,
} from "@repo/shared";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { Textarea } from "@repo/ui/components/textarea";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

const agents = [
  { value: "build", label: "Build" },
  { value: "plan", label: "Plan" },
  { value: "issue-resolver", label: "Issue resolver" },
  { value: "pr-reviewer", label: "PR reviewer" },
] as const;
const schedules = [
  { value: "", label: "Manual only (no schedule)" },
  { value: "0 0 * * *", label: "Every night at midnight" },
  { value: "0 9 * * *", label: "Every day at 9:00 AM" },
  { value: "0 0 * * 0", label: "Every week on Sunday" },
] as const;
type Agent = (typeof agents)[number]["value"];
type DraftTask = {
  id: number;
  path: string;
  prompt: string;
  agent: Agent;
  model: string;
};
type Props = {
  mode: "create" | "edit";
  initialValues?: CreateProjectAutomationInput;
  isPending?: boolean;
  submitError?: string | null;
  cancelHref?: string;
  onSubmit: (values: CreateProjectAutomationInput) => Promise<void>;
};
const schema = projectAutomationSchema.extend({
  tasks: z.array(projectAutomationTaskSchema).min(1),
});
const blankTask = (id: number): DraftTask => ({
  id,
  path: "",
  prompt: "",
  agent: "build",
  model: "",
});

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border border-b py-7 first:pt-0">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

const repoPrefix = (name: string) => `/${name.split("/").at(-1) ?? name}`;

export function ProjectAutomationForm({
  mode,
  initialValues,
  isPending = false,
  submitError,
  cancelHref = "/automations",
  onSubmit,
}: Props) {
  const projectsQuery = useGetProjects();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [projectId, setProjectId] = useState(initialValues?.project_id ?? "");
  const [schedule, setSchedule] = useState(
    initialValues?.cron_expression ?? "",
  );
  const [timezone, setTimezone] = useState(initialValues?.timezone ?? "");
  const startingTasks = initialValues?.tasks.map((task, index) => ({
    id: index + 1,
    path: task.path_from_code,
    prompt: task.task_prompt,
    agent: task.agent,
    model: task.model ?? "",
  })) ?? [blankTask(1)];
  const [tasks, setTasks] = useState<DraftTask[]>(startingTasks);
  const [nextTaskId, setNextTaskId] = useState(startingTasks.length + 1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const reposQuery = useGetProjectGithubReposById(projectId || null);

  useEffect(() => {
    if (!initialValues?.timezone)
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [initialValues?.timezone]);

  const projects = projectsQuery.data ?? [];
  const prefixes = (reposQuery.data ?? []).map((repo) =>
    repoPrefix(repo.full_name),
  );
  const updateTask = (id: number, patch: Partial<DraftTask>) =>
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    if (!projects.some((project) => project.id === projectId)) {
      setValidationError("Select a project for this automation.");
      return;
    }
    if (!schedules.some((option) => option.value === schedule)) {
      setValidationError("Select a schedule for this automation.");
      return;
    }
    if (!timezone) {
      setValidationError(
        "Your timezone could not be detected. Refresh and try again.",
      );
      return;
    }
    const result = schema.safeParse({
      name: name.trim(),
      description: description.trim() || undefined,
      project_id: projectId,
      cron_expression: schedule,
      timezone,
      tasks: tasks.map((task, index) => ({
        path_from_code: task.path.trim(),
        task_prompt: task.prompt.trim(),
        agent: task.agent,
        order_number: index + 1,
        model: task.model.trim() || undefined,
      })),
    });
    if (!result.success) {
      setValidationError(
        result.error.issues[0]?.message ?? "Check the automation details.",
      );
      return;
    }
    await onSubmit(result.data);
  };

  const editing = mode === "edit";
  const disabled =
    isPending ||
    projectsQuery.isLoading ||
    projectsQuery.isError ||
    projects.length === 0 ||
    !timezone;
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={cancelHref}>
          <ArrowLeft /> Back to automations
        </Link>
      </Button>
      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          {editing ? "Edit automation" : "Create automation"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {editing
            ? "Update this automation’s schedule and tasks."
            : "Run one or more agent tasks on a recurring schedule."}
        </p>
      </header>
      <form
        onSubmit={handleSubmit}
        className="[&_[data-slot=input]]:border-foreground/25 [&_[data-slot=native-select]]:border-foreground/25 [&_[data-slot=textarea]]:border-foreground/25 dark:[&_[data-slot=input]]:border-foreground/30 dark:[&_[data-slot=native-select]]:border-foreground/30 dark:[&_[data-slot=textarea]]:border-foreground/30 mt-8"
      >
        <Section
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
                disabled={isPending}
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
                disabled={projectsQuery.isLoading || isPending}
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
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">
              {description.length}/200 characters.
            </p>
          </div>
        </Section>
        <Section
          title="Schedule"
          description="Choose how often this automation should run."
        >
          <div className="grid max-w-xl gap-2">
            <Label htmlFor="automation-schedule">Schedule</Label>
            <NativeSelect
              id="automation-schedule"
              className="w-full"
              value={schedule}
              onChange={(event) => setSchedule(event.target.value)}
              disabled={isPending}
            >
              {schedules.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <p className="text-muted-foreground text-xs">
              {schedule
                ? "The automation will repeat automatically on this schedule."
                : "This automation will only run when started manually."}
            </p>
            <p className="text-muted-foreground text-xs">
              Timezone: {timezone || "Detecting your timezone…"}
            </p>
          </div>
        </Section>
        <Section
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
                    onClick={() =>
                      setTasks((current) =>
                        current.length === 1
                          ? current
                          : current.filter((item) => item.id !== task.id),
                      )
                    }
                    disabled={tasks.length === 1 || isPending}
                  >
                    <Trash2 /> Remove
                  </Button>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`task-path-${task.id}`}>
                      Path from code dir
                    </Label>
                    <Input
                      id={`task-path-${task.id}`}
                      value={task.path}
                      onChange={(event) =>
                        updateTask(task.id, { path: event.target.value })
                      }
                      placeholder="/repository-name/src/components"
                      minLength={2}
                      maxLength={100}
                      disabled={isPending}
                      required
                    />
                    {projectId && reposQuery.isLoading ? (
                      <p className="text-muted-foreground text-xs">
                        Loading repository paths…
                      </p>
                    ) : prefixes.length ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {prefixes.map((prefix) => (
                            <Button
                              key={prefix}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 font-mono text-xs"
                              onClick={() =>
                                updateTask(task.id, { path: prefix })
                              }
                              disabled={isPending}
                            >
                              {prefix}
                            </Button>
                          ))}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          Start with a repository path, then add any path before
                          or after it.
                        </p>
                        {task.path.trim() &&
                        !prefixes.some((prefix) =>
                          task.path.trim().startsWith(prefix),
                        ) ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Please check this path. It does not start with one
                            of this project&apos;s repositories.
                          </p>
                        ) : null}
                      </>
                    ) : projectId && !reposQuery.isError ? (
                      <p className="text-muted-foreground text-xs">
                        This project has no attached repositories.
                      </p>
                    ) : reposQuery.isError ? (
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
                      value={task.prompt}
                      onChange={(event) =>
                        updateTask(task.id, { prompt: event.target.value })
                      }
                      placeholder="Review this area and propose improvements."
                      minLength={2}
                      maxLength={500}
                      className="min-h-24 resize-y"
                      disabled={isPending}
                      required
                    />
                    <p className="text-muted-foreground text-xs">
                      {task.prompt.length}/500 characters.
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
                        disabled={isPending}
                      >
                        {agents.map((agent) => (
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
                        disabled={isPending}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTasks((current) => [...current, blankTask(nextTaskId)]);
                setNextTaskId((id) => id + 1);
              }}
              disabled={isPending || tasks.length >= 100}
            >
              <Plus /> Add task
            </Button>
          </div>
        </Section>
        {validationError || submitError ? (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>
              {validationError ?? submitError}
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button asChild type="button" variant="outline" disabled={isPending}>
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={disabled}>
            {isPending
              ? editing
                ? "Saving…"
                : "Creating…"
              : editing
                ? "Save changes"
                : "Create automation"}
          </Button>
        </div>
      </form>
    </div>
  );
}
