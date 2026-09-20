import type { CreateProjectAutomationInput } from "@repo/api-client";
import { useGetProjectGithubReposById, useGetProjects } from "@repo/api-hooks";
import {
  projectAutomationSchema,
  projectAutomationTaskSchema,
  z,
} from "@repo/shared";
import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChoiceField } from "@/components/choice-field";
import { PageChromeLayout, PageHeader } from "@/components/page-chrome";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { AUTOMATION_AGENTS, AUTOMATION_SCHEDULES } from "./automation-utils";

type Agent = (typeof AUTOMATION_AGENTS)[number]["id"];
type DraftTask = {
  id: number;
  path: string;
  prompt: string;
  agent: Agent;
  model: string;
};
type Template = "dependency-maintenance" | "sentry-resolution";

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

const templates: Record<Template, Omit<DraftTask, "id">[]> = {
  "dependency-maintenance": [
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
  "sentry-resolution": [
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
};

export function AutomationFormScreen({
  initialValues,
  isPending,
  mode,
  onSubmit,
  submitError,
}: {
  initialValues?: CreateProjectAutomationInput;
  isPending: boolean;
  mode: "create" | "edit";
  onSubmit: (input: CreateProjectAutomationInput) => Promise<void>;
  submitError?: string | null;
}) {
  const router = useRouter();
  const theme = useTheme();
  const projectsQuery = useGetProjects();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [projectId, setProjectId] = useState(initialValues?.project_id ?? "");
  const [schedule, setSchedule] = useState<string>(
    initialValues?.schedule_id ?? "manual",
  );
  const [timezone, setTimezone] = useState(initialValues?.timezone ?? "");
  const startingTasks = useMemo(
    () =>
      initialValues?.tasks.map((task, index) => ({
        id: index + 1,
        path: task.path_from_code,
        prompt: task.task_prompt,
        agent: task.agent,
        model: task.model ?? "",
      })) ?? [blankTask(1)],
    [initialValues],
  );
  const [tasks, setTasks] = useState<DraftTask[]>(startingTasks);
  const [nextTaskId, setNextTaskId] = useState(startingTasks.length + 1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const reposQuery = useGetProjectGithubReposById(projectId || null);
  const projects = projectsQuery.data ?? [];
  const projectOptions = projects.map((project) => ({
    id: project.id,
    label: project.name,
  }));
  const prefixes = (reposQuery.data ?? []).map(
    (repo) => `/${repo.full_name.split("/").at(-1) ?? repo.full_name}`,
  );
  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      backgroundColor: theme.backgroundElement,
      borderColor: theme.backgroundSelected,
    },
  ];

  useEffect(() => {
    if (initialValues?.timezone) return;
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [initialValues?.timezone]);

  const updateTask = (id: number, patch: Partial<DraftTask>) =>
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    );

  const applyTemplate = (template: Template) => {
    const next = templates[template].map((task, index) => ({
      ...task,
      id: index + 1,
    }));
    setTasks(next);
    setNextTaskId(next.length + 1);
  };

  const submit = async () => {
    setValidationError(null);
    if (!projects.some((project) => project.id === projectId)) {
      setValidationError("Select a project for this automation.");
      return;
    }
    if (!AUTOMATION_SCHEDULES.some((item) => item.id === schedule)) {
      setValidationError("Select a schedule for this automation.");
      return;
    }
    const result = schema.safeParse({
      name: name.trim(),
      description: description.trim() || undefined,
      project_id: projectId,
      schedule_id: schedule,
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

  const disabled =
    isPending ||
    projectsQuery.isPending ||
    projectsQuery.isError ||
    projects.length === 0 ||
    !timezone;

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.screen}
      >
        <PageChromeLayout
          top={
            <PageHeader
              onBack={() => router.back()}
              title={mode === "edit" ? "Edit automation" : "Create automation"}
            />
          }
        >
          {({ topInset }) => (
            <ScrollView
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={[
                styles.content,
                { paddingTop: topInset + 12 },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              <Section
                title="Automation details"
                description="Choose the project and describe what this automation does."
              >
                <Field label="Name" count={`${name.length}/20`}>
                  <TextInput
                    autoFocus={mode === "create"}
                    editable={!isPending}
                    maxLength={20}
                    onChangeText={setName}
                    placeholder="e.g. Weekly review"
                    placeholderTextColor={theme.textSecondary}
                    style={inputStyle}
                    value={name}
                  />
                </Field>
                <ChoiceField
                  disabled={isPending || projectsQuery.isPending}
                  label="Project"
                  onChange={setProjectId}
                  options={projectOptions}
                  placeholder={
                    projectsQuery.isPending
                      ? "Loading projects…"
                      : "Select a project"
                  }
                  value={projectId}
                />
                {projectsQuery.isError ? (
                  <ErrorText>
                    Projects could not be loaded. Refresh and try again.
                  </ErrorText>
                ) : null}
                {!projectsQuery.isPending && projects.length === 0 ? (
                  <ThemedText themeColor="textSecondary">
                    Create a project before creating an automation.
                  </ThemedText>
                ) : null}
                <Field
                  label="Description (optional)"
                  count={`${description.length}/200`}
                >
                  <TextInput
                    editable={!isPending}
                    maxLength={200}
                    multiline
                    onChangeText={setDescription}
                    placeholder="What should this automation accomplish?"
                    placeholderTextColor={theme.textSecondary}
                    style={[inputStyle, styles.multiline]}
                    textAlignVertical="top"
                    value={description}
                  />
                </Field>
              </Section>

              <Section
                title="Schedule"
                description="Choose how often this automation should run."
              >
                <ChoiceField
                  disabled={isPending}
                  label="Schedule"
                  onChange={setSchedule}
                  options={[...AUTOMATION_SCHEDULES]}
                  placeholder="Select a schedule"
                  value={schedule}
                />
                <ThemedText style={styles.help} themeColor="textSecondary">
                  {schedule !== "manual"
                    ? "The automation will repeat automatically on this schedule."
                    : "This automation will only run when started manually."}
                </ThemedText>
                <ThemedText style={styles.help} themeColor="textSecondary">
                  Timezone: {timezone || "Detecting your timezone…"}
                </ThemedText>
              </Section>

              <Section
                title="Tasks"
                description="Tasks run in the order shown. At least one task is required."
              >
                {mode === "create" ? (
                  <View
                    style={[
                      styles.template,
                      { borderColor: theme.backgroundSelected },
                    ]}
                  >
                    <ThemedText style={styles.fieldLabel}>
                      Import task template
                    </ThemedText>
                    <ThemedText style={styles.help} themeColor="textSecondary">
                      Importing replaces only the tasks below. Choose a
                      repository path for each imported task.
                    </ThemedText>
                    <View style={styles.wrapRow}>
                      <SmallButton
                        label="Dependency maintenance and PR"
                        onPress={() => applyTemplate("dependency-maintenance")}
                      />
                      <SmallButton
                        label="Resolve a Sentry error"
                        onPress={() => applyTemplate("sentry-resolution")}
                      />
                    </View>
                  </View>
                ) : null}

                {tasks.map((task, index) => (
                  <View
                    key={task.id}
                    style={[
                      styles.taskCard,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                  >
                    <View style={styles.taskHeader}>
                      <ThemedText style={styles.fieldLabel}>
                        Task {index + 1}
                      </ThemedText>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: tasks.length === 1 }}
                        disabled={tasks.length === 1 || isPending}
                        onPress={() =>
                          setTasks((current) =>
                            current.filter((item) => item.id !== task.id),
                          )
                        }
                        style={({ pressed }) => [
                          styles.remove,
                          (tasks.length === 1 || isPending) && styles.disabled,
                          pressed && styles.pressed,
                        ]}
                      >
                        <SymbolView
                          name={{ ios: "trash", android: "delete" }}
                          size={16}
                          tintColor="#dc2626"
                        />
                        <ThemedText style={styles.removeText}>
                          Remove
                        </ThemedText>
                      </Pressable>
                    </View>
                    <Field label="Path from code dir">
                      <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isPending}
                        maxLength={100}
                        onChangeText={(value) =>
                          updateTask(task.id, { path: value })
                        }
                        placeholder="/repository-name/src/components"
                        placeholderTextColor={theme.textSecondary}
                        style={inputStyle}
                        value={task.path}
                      />
                    </Field>
                    {projectId && reposQuery.isPending ? (
                      <ActivityIndicator size="small" />
                    ) : null}
                    {prefixes.length ? (
                      <View style={styles.wrapRow}>
                        {prefixes.map((prefix) => (
                          <SmallButton
                            key={prefix}
                            label={prefix}
                            onPress={() =>
                              updateTask(task.id, { path: prefix })
                            }
                          />
                        ))}
                      </View>
                    ) : null}
                    {task.path.trim() &&
                    prefixes.length &&
                    !prefixes.some((prefix) =>
                      task.path.trim().startsWith(prefix),
                    ) ? (
                      <ThemedText style={styles.warning}>
                        Please check this path. It does not start with one of
                        this project's repositories.
                      </ThemedText>
                    ) : null}
                    <Field
                      label="Task prompt"
                      count={`${task.prompt.length}/500`}
                    >
                      <TextInput
                        editable={!isPending}
                        maxLength={500}
                        multiline
                        onChangeText={(value) =>
                          updateTask(task.id, { prompt: value })
                        }
                        placeholder="Review this area and propose improvements."
                        placeholderTextColor={theme.textSecondary}
                        style={[inputStyle, styles.multiline]}
                        textAlignVertical="top"
                        value={task.prompt}
                      />
                    </Field>
                    <ChoiceField
                      disabled={isPending}
                      label="Agent"
                      onChange={(value) =>
                        updateTask(task.id, { agent: value as Agent })
                      }
                      options={[...AUTOMATION_AGENTS]}
                      placeholder="Select an agent"
                      value={task.agent}
                    />
                    <Field label="Model ID (optional)">
                      <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isPending}
                        maxLength={100}
                        onChangeText={(value) =>
                          updateTask(task.id, { model: value })
                        }
                        placeholder="openai/gpt-5.6-luna"
                        placeholderTextColor={theme.textSecondary}
                        style={inputStyle}
                        value={task.model}
                      />
                    </Field>
                  </View>
                ))}
                <SmallButton
                  label="Add task"
                  onPress={() => {
                    setTasks((current) => [...current, blankTask(nextTaskId)]);
                    setNextTaskId((id) => id + 1);
                  }}
                />
              </Section>

              {validationError || submitError ? (
                <View style={styles.errorBox}>
                  <ErrorText>{validationError ?? submitError}</ErrorText>
                </View>
              ) : null}
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isPending}
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.actionText}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  onPress={() => void submit()}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: theme.text },
                    disabled && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {isPending ? (
                    <ActivityIndicator color={theme.background} />
                  ) : (
                    <ThemedText
                      style={[styles.actionText, { color: theme.background }]}
                    >
                      {mode === "edit" ? "Save changes" : "Create automation"}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          )}
        </PageChromeLayout>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.section, { borderColor: theme.backgroundSelected }]}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <ThemedText style={styles.sectionDescription} themeColor="textSecondary">
        {description}
      </ThemedText>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({
  children,
  count,
  label,
}: {
  children: React.ReactNode;
  count?: string;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeading}>
        <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
        {count ? (
          <ThemedText style={styles.help} themeColor="textSecondary">
            {count}
          </ThemedText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function SmallButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallButton,
        { borderColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText style={styles.smallButtonText}>{label}</ThemedText>
    </Pressable>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <ThemedText style={styles.error}>{children}</ThemedText>;
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  actionText: { fontSize: 14, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 12, paddingTop: 4 },
  content: { gap: 22, paddingBottom: 40, paddingHorizontal: 18 },
  disabled: { opacity: 0.45 },
  error: { color: "#dc2626", fontSize: 13, lineHeight: 19 },
  errorBox: {
    backgroundColor: "rgba(220,38,38,0.08)",
    borderRadius: 12,
    padding: 13,
  },
  field: { gap: 7 },
  fieldHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  fieldLabel: { fontSize: 13, fontWeight: "700" },
  help: { fontSize: 12, lineHeight: 17 },
  input: {
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  multiline: { minHeight: 96 },
  pressed: { opacity: 0.65 },
  remove: { alignItems: "center", flexDirection: "row", gap: 5, minHeight: 34 },
  removeText: { color: "#dc2626", fontSize: 12, fontWeight: "700" },
  screen: { flex: 1 },
  section: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 22 },
  sectionBody: { gap: 16, paddingTop: 16 },
  sectionDescription: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  smallButton: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  smallButtonText: { fontSize: 12, fontWeight: "600" },
  taskCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 15,
    padding: 15,
  },
  taskHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  template: {
    borderRadius: 14,
    borderStyle: "dashed",
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    padding: 14,
  },
  warning: { color: "#d97706", fontSize: 12, lineHeight: 17 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
