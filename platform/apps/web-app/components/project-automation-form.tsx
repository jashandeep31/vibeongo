"use client";

import { useGetProjectGithubReposById, useGetProjects } from "@repo/api-hooks";
import type { CreateProjectAutomationInput } from "@repo/api-client";
import { DEFAULT_MODELS, type DefaultModel } from "@/constants/models";
import {
  projectAutomationSchema,
  projectAutomationTaskSchema,
  z,
} from "@repo/shared";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@repo/ui/components/combobox";
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
type AutomationTemplate = "dependency-maintenance" | "sentry-resolution";
type Props = {
  mode: "create" | "edit";
  initialValues?: CreateProjectAutomationInput;
  isPending?: boolean;
  submitError?: string | null;
  cancelHref?: string;
  onSubmit: (values: CreateProjectAutomationInput) => Promise<void>;
};

function ModelCombobox({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const customValue = search.trim();
  const selectedModel = DEFAULT_MODELS.find((model) => model.id === value);
  const customSelectedModel: DefaultModel | undefined =
    value && !selectedModel ? { id: value, provider: "custom" } : undefined;
  const options = customSelectedModel
    ? [...DEFAULT_MODELS, customSelectedModel]
    : DEFAULT_MODELS;
  const hasExactMatch = options.some(
    (model) => model.id.toLowerCase() === customValue.toLowerCase(),
  );
  const customOption =
    customValue && !hasExactMatch
      ? { id: customValue, provider: "custom" }
      : undefined;
  const allOptions = customOption ? [...options, customOption] : options;
  const normalizedSearch = customValue.toLowerCase();
  const visibleOptions = allOptions.filter(
    (model) =>
      !normalizedSearch || model.id.toLowerCase().includes(normalizedSearch),
  );
  const selectedOption = allOptions.find((model) => model.id === value) ?? null;

  return (
    <Combobox<DefaultModel>
      value={selectedOption}
      onValueChange={(model) => onChange(model?.id ?? "")}
      onInputValueChange={(inputValue, details) => {
        setSearch(inputValue);
        if (details.reason === "input-change") onChange(inputValue);
      }}
      itemToStringLabel={(model) => model.id}
      itemToStringValue={(model) => model.id}
      isItemEqualToValue={(a, b) => a?.id === b?.id}
    >
      <ComboboxInput
        id={id}
        placeholder="Search or enter a model ID"
        disabled={disabled}
        showClear
      />
      <ComboboxContent>
        <ComboboxList>
          {visibleOptions.map((model) => (
            <ComboboxItem key={model.id} value={model}>
              <span className="truncate">{model.id}</span>
            </ComboboxItem>
          ))}
          <ComboboxEmpty>No matching models.</ComboboxEmpty>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

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

const automationTemplates: Array<{
  value: Exclude<AutomationTemplate, "">;
  label: string;
  description: string;
  name: string;
  tasks: Array<{
    path: string;
    prompt: string;
    agent: Agent;
    model: string;
  }>;
}> = [
  {
    value: "dependency-maintenance",
    label: "Dependency maintenance and PR",
    description:
      "Find outdated packages, update compatible versions, verify the changes, and prepare a detailed PR.",
    name: "Dependency updates",
    tasks: [
      {
        path: "",
        prompt:
          "Inspect the repository for outdated package dependencies. Identify current versions, available updates, breaking changes, and packages that cannot be updated safely.",
        agent: "plan",
        model: "",
      },
      {
        path: "",
        prompt:
          "Update packages to the latest compatible versions. Run the repository's relevant tests, type checks, and lint checks, and leave incompatible or blocked packages unchanged with an explanation.",
        agent: "build",
        model: "",
      },
      {
        path: "",
        prompt:
          "Review the dependency changes and create a pull request with a complete summary, testing results, updated packages, and a clear list of packages that remain outdated and why.",
        agent: "pr-reviewer",
        model: "",
      },
    ],
  },
  {
    value: "sentry-resolution",
    label: "Resolve a Sentry error",
    description:
      "Understand a Sentry issue, apply the Sentry template context, verify the fix, and prepare a detailed PR.",
    name: "Resolve Sentry error",
    tasks: [
      {
        path: "",
        prompt:
          "Get context about this project and investigate the reported Sentry error, including the stack trace, affected code path, recent changes, and likely root cause.",
        agent: "plan",
        model: "",
      },
      {
        path: "",
        prompt:
          "Process the provided {{sentry}} template context and use it to implement a focused fix for the reported error. Keep the change scoped and document any assumptions.",
        agent: "issue-resolver",
        model: "",
      },
      {
        path: "",
        prompt:
          "Verify that the Sentry error is fixed by running the relevant tests and reproducing the affected flow where possible. Check for regressions and capture the verification evidence.",
        agent: "build",
        model: "",
      },
      {
        path: "",
        prompt:
          "Create a pull request with the Sentry issue details, root cause, implemented fix, verification results, and any remaining risks or follow-up work.",
        agent: "pr-reviewer",
        model: "",
      },
    ],
  },
];

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

  const applyTemplate = (value: AutomationTemplate) => {
    const selected = automationTemplates.find((item) => item.value === value);
    if (!selected) return;

    setTasks(
      selected.tasks.map((task, index) => ({
        ...task,
        id: index + 1,
      })),
    );
    setNextTaskId(selected.tasks.length + 1);
  };

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
            {!editing ? (
              <div className="border-border bg-muted/10 rounded-xl border border-dashed p-4">
                <p className="text-sm font-medium">Import task template</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Importing replaces only the tasks below. Your automation
                  details and schedule stay unchanged. Choose a repository path
                  for each imported task.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {automationTemplates.map((item) => (
                    <Button
                      key={item.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(item.value)}
                      disabled={isPending}
                      title={item.description}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
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
                      <ModelCombobox
                        id={`task-model-${task.id}`}
                        value={task.model}
                        onChange={(model) => updateTask(task.id, { model })}
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
