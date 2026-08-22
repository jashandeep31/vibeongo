import {
  useCreateProject,
  useGetGithubRepos,
  useGetProjectConfigForEdit,
  useInstanceRegions,
  useInstanceTypes,
  useSandboxRegions,
  useSandboxTypes,
  useSshKeys,
  useUpdateProject,
} from "@repo/api-hooks";
import {
  projectConfigValidator,
  type ProjectProvider,
  type z,
} from "@repo/shared";
import { useRouter } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { ConnectGithubRepoDrawer } from "@/components/github-repos/connect-github-repo-drawer";
import {
  buildProjectPackages,
  createDefaultProjectServicesConfig,
  hydrateProjectServicesConfig,
  ProjectServicesConfig,
} from "@/components/projects/project-services-config";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ProjectPorts = z.infer<typeof projectConfigValidator>["config"]["ports"];
type SandboxProvider = "e2b" | "vercel" | "daytona";
type Choice = { id: string; label: string };

const sandboxProviderOptions: Choice[] = [
  { id: "e2b", label: "E2B" },
  { id: "vercel", label: "Vercel" },
  { id: "daytona", label: "Daytona" },
];

const isSandboxProvider = (value: string): value is SandboxProvider =>
  value === "e2b" || value === "vercel" || value === "daytona";

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string")
      return response.data.message;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function ProjectFormScreen({ projectId }: { projectId?: string }) {
  const theme = useTheme();
  const router = useRouter();
  const isEditing = Boolean(projectId);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const projectConfigQuery = useGetProjectConfigForEdit(projectId ?? null);
  const instanceRegionsQuery = useInstanceRegions();
  const sandboxRegionsQuery = useSandboxRegions();
  const reposQuery = useGetGithubRepos();
  const sshKeysQuery = useSshKeys();
  const isSaving = createProject.isPending || updateProject.isPending;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<ProjectProvider>("aws");
  const [instanceRegionId, setInstanceRegionId] = useState("");
  const [instanceTypeId, setInstanceTypeId] = useState("");
  const [sandboxProvider, setSandboxProvider] =
    useState<SandboxProvider>("e2b");
  const [sandboxRegionId, setSandboxRegionId] = useState("");
  const [sandboxTypeId, setSandboxTypeId] = useState("");
  const [githubRepoIds, setGithubRepoIds] = useState<string[]>([]);
  const [sshKeyIds, setSshKeyIds] = useState<string[]>([]);
  const [initialScript, setInitialScript] = useState("");
  const [finalScript, setFinalScript] = useState("");
  const [devScript, setDevScript] = useState("");
  const [servicesConfig, setServicesConfig] = useState(
    createDefaultProjectServicesConfig,
  );
  const [ports, setPorts] = useState<ProjectPorts>([]);
  const [hydratedProjectId, setHydratedProjectId] = useState<string | null>(
    null,
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [isRepoDrawerOpen, setIsRepoDrawerOpen] = useState(false);

  const instanceRegions = useMemo(
    () =>
      (instanceRegionsQuery.data ?? []).filter(
        (region) => region.provider === provider,
      ),
    [instanceRegionsQuery.data, provider],
  );
  const sandboxRegions = useMemo(
    () =>
      (sandboxRegionsQuery.data ?? []).filter(
        (region) => region.provider === sandboxProvider,
      ),
    [sandboxProvider, sandboxRegionsQuery.data],
  );
  const instanceTypesQuery = useInstanceTypes(instanceRegionId);
  const sandboxTypesQuery = useSandboxTypes(sandboxRegionId);
  const instanceTypes = instanceTypesQuery.data ?? [];
  const sandboxTypes = sandboxTypesQuery.data ?? [];

  useEffect(() => {
    const config = projectConfigQuery.data;
    if (!config || hydratedProjectId === config.project.id) return;

    setName(config.project.name);
    setDescription(config.project.description ?? "");
    setProvider(config.provider);
    setInstanceRegionId(config.instanceRegionId ?? "");
    setInstanceTypeId(config.instanceTypeId);
    setSandboxRegionId(config.sandboxRegionId ?? "");
    setSandboxTypeId(config.sandboxTypeId);
    setGithubRepoIds(config.githubRepoIds);
    setSshKeyIds(config.sshKeyIds);
    setInitialScript(config.project.initial_script);
    setFinalScript(config.project.final_script);
    setDevScript(config.project.dev_script);
    setServicesConfig(hydrateProjectServicesConfig(config.config.packages));
    setPorts(config.config.ports);
    setHydratedProjectId(config.project.id);
  }, [hydratedProjectId, projectConfigQuery.data]);

  useEffect(() => {
    if (isEditing && hydratedProjectId !== projectId) return;
    if (!instanceRegions.length) return;
    if (instanceRegions.some((region) => region.id === instanceRegionId))
      return;
    setInstanceRegionId(instanceRegions[0]?.id ?? "");
    setInstanceTypeId("");
  }, [
    hydratedProjectId,
    instanceRegionId,
    instanceRegions,
    isEditing,
    projectId,
  ]);

  useEffect(() => {
    if (isEditing && hydratedProjectId !== projectId) return;
    if (!instanceTypes.length) return;
    if (instanceTypes.some((type) => type.id === instanceTypeId)) return;
    setInstanceTypeId(instanceTypes[0]?.id ?? "");
  }, [hydratedProjectId, instanceTypeId, instanceTypes, isEditing, projectId]);

  useEffect(() => {
    if (isEditing && hydratedProjectId !== projectId) return;
    const selected = sandboxRegionsQuery.data?.find(
      (region) => region.id === sandboxRegionId,
    );
    if (
      selected &&
      isSandboxProvider(selected.provider) &&
      selected.provider !== sandboxProvider
    ) {
      setSandboxProvider(selected.provider);
    }
  }, [
    hydratedProjectId,
    isEditing,
    projectId,
    sandboxProvider,
    sandboxRegionId,
    sandboxRegionsQuery.data,
  ]);

  useEffect(() => {
    if (isEditing && hydratedProjectId !== projectId) return;
    if (!sandboxRegions.length) return;
    if (sandboxRegions.some((region) => region.id === sandboxRegionId)) return;
    const selected = sandboxRegionsQuery.data?.find(
      (region) => region.id === sandboxRegionId,
    );
    if (selected && isSandboxProvider(selected.provider)) return;
    setSandboxRegionId(sandboxRegions[0]?.id ?? "");
    setSandboxTypeId("");
  }, [
    hydratedProjectId,
    isEditing,
    projectId,
    sandboxRegionId,
    sandboxRegions,
    sandboxRegionsQuery.data,
  ]);

  useEffect(() => {
    if (isEditing && hydratedProjectId !== projectId) return;
    if (!sandboxTypes.length) return;
    if (sandboxTypes.some((type) => type.id === sandboxTypeId)) return;
    setSandboxTypeId(sandboxTypes[0]?.id ?? "");
  }, [hydratedProjectId, isEditing, projectId, sandboxTypeId, sandboxTypes]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/", params: { view: "projects" } });
  };

  const toggle = (
    id: string,
    values: string[],
    setValues: (values: string[]) => void,
  ) =>
    setValues(
      values.includes(id)
        ? values.filter((value) => value !== id)
        : [...values, id],
    );

  const submit = async () => {
    if (isSaving) return;
    let packages;
    try {
      packages = buildProjectPackages(servicesConfig);
    } catch (error) {
      setErrors([getErrorMessage(error, "Invalid service configuration")]);
      return;
    }

    const validation = projectConfigValidator.safeParse({
      name,
      description,
      provider,
      regionId: instanceRegionId,
      instanceTypeId,
      sandboxTypeId,
      sshKeyIds,
      githubRepoIds,
      initialScript,
      finalScript,
      devScript,
      config: { ports, packages },
    });
    if (!validation.success) {
      setErrors(
        Array.from(
          new Set(validation.error.issues.map((issue) => issue.message)),
        ),
      );
      return;
    }

    setErrors([]);
    try {
      if (projectId) {
        await updateProject.mutateAsync({
          id: projectId,
          projectData: validation.data,
        });
      } else {
        await createProject.mutateAsync(validation.data);
      }
      Toast.show({
        type: "success",
        text1: isEditing ? "Project saved" : "Project created",
      });
      router.replace({ pathname: "/", params: { view: "projects" } });
    } catch (error) {
      setErrors([
        getErrorMessage(
          error,
          isEditing
            ? "Project changes could not be saved."
            : "Project could not be created.",
        ),
      ]);
    }
  };

  if (
    isEditing &&
    (projectConfigQuery.isPending ||
      (projectConfigQuery.data && hydratedProjectId !== projectId))
  ) {
    return <LoadingState label="Loading project…" />;
  }

  if (isEditing && (projectConfigQuery.isError || !projectConfigQuery.data)) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: theme.background }]}
      >
        <Header onBack={goBack} title="Edit project" />
        <View style={styles.centeredState}>
          <SymbolView
            name={{ ios: "exclamationmark.circle", android: "error_outline" }}
            size={28}
            tintColor="#ef4444"
          />
          <ThemedText style={styles.stateTitle}>
            Project could not be loaded
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Check your connection and try again.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.screen}
      >
        <Header
          onBack={goBack}
          title={isEditing ? "Edit project" : "Create project"}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FormSection title="Project details">
            <FormField label="Name">
              <FormInput
                autoCapitalize="words"
                editable={!isSaving}
                maxLength={20}
                onChangeText={setName}
                placeholder="My project"
                value={name}
              />
            </FormField>
            <FormField label="Description (optional)">
              <FormInput
                editable={!isSaving}
                multiline
                onChangeText={setDescription}
                placeholder="What is this project for?"
                style={styles.multilineInput}
                value={description}
              />
            </FormField>
          </FormSection>

          <FormSection title="Runtime">
            <ThemedText style={styles.subheading}>Virtual machine</ThemedText>
            <ChoiceField
              disabled={instanceRegionsQuery.isPending || isSaving}
              label="Region"
              onChange={(id) => {
                setInstanceRegionId(id);
                setInstanceTypeId("");
              }}
              options={instanceRegions.map((region) => ({
                id: region.id,
                label: `${region.name} (${region.slug})`,
              }))}
              placeholder={
                instanceRegionsQuery.isPending
                  ? "Loading regions…"
                  : "Select a region"
              }
              value={instanceRegionId}
            />
            <ChoiceField
              disabled={
                !instanceRegionId || instanceTypesQuery.isPending || isSaving
              }
              label="Machine type"
              onChange={setInstanceTypeId}
              options={instanceTypes.map((type) => ({
                id: type.id,
                label: `${type.name} · ${type.cpu || "N/A"} · ${type.ram || "N/A"}`,
              }))}
              placeholder={
                instanceTypesQuery.isPending
                  ? "Loading machine types…"
                  : "Select a machine type"
              }
              value={instanceTypeId}
            />
            <ThemedText style={[styles.subheading, styles.subheadingSpacing]}>
              Sandbox
            </ThemedText>
            <ChoiceField
              disabled={sandboxRegionsQuery.isPending || isSaving}
              label="Provider"
              onChange={(id) => {
                if (!isSandboxProvider(id)) return;
                setSandboxProvider(id);
                setSandboxRegionId("");
                setSandboxTypeId("");
              }}
              options={sandboxProviderOptions}
              placeholder="Select a provider"
              value={sandboxProvider}
            />
            <ChoiceField
              disabled={sandboxRegionsQuery.isPending || isSaving}
              label="Region"
              onChange={(id) => {
                setSandboxRegionId(id);
                setSandboxTypeId("");
              }}
              options={sandboxRegions.map((region) => ({
                id: region.id,
                label: `${region.name} (${region.slug})`,
              }))}
              placeholder={
                sandboxRegionsQuery.isPending
                  ? "Loading regions…"
                  : "Select a region"
              }
              value={sandboxRegionId}
            />
            <ChoiceField
              disabled={
                !sandboxRegionId || sandboxTypesQuery.isPending || isSaving
              }
              label="Machine type"
              onChange={setSandboxTypeId}
              options={sandboxTypes.map((type) => ({
                id: type.id,
                label: `${type.name} · ${type.cpu || "N/A"} · ${type.ram || "N/A"}`,
              }))}
              placeholder={
                sandboxTypesQuery.isPending
                  ? "Loading machine types…"
                  : "Select a machine type"
              }
              value={sandboxTypeId}
            />
          </FormSection>

          <FormSection title="Source and access">
            <SelectableGroup
              actionLabel="Add repository"
              emptyLabel="No repositories connected."
              icon={{
                ios: "chevron.left.forwardslash.chevron.right",
                android: "code",
              }}
              isLoading={reposQuery.isPending}
              label="GitHub repositories"
              layout="list"
              onAction={() => setIsRepoDrawerOpen(true)}
              onToggle={(id) => toggle(id, githubRepoIds, setGithubRepoIds)}
              options={(reposQuery.data ?? []).map((repo) => ({
                id: repo.id,
                label: repo.full_name,
              }))}
              selectedIds={githubRepoIds}
            />
            <SelectableGroup
              emptyLabel="No SSH keys added. Add keys from Settings."
              icon={{ ios: "key", android: "key" }}
              isLoading={sshKeysQuery.isPending}
              label="SSH keys"
              onToggle={(id) => toggle(id, sshKeyIds, setSshKeyIds)}
              options={(sshKeysQuery.data ?? []).map((key) => ({
                id: key.id,
                label: key.name,
              }))}
              selectedIds={sshKeyIds}
            />
          </FormSection>

          <FormSection title="Advanced settings">
            <ScriptField
              label="Initial script"
              onChangeText={setInitialScript}
              placeholder="Runs before repositories are set up"
              value={initialScript}
            />
            <ScriptField
              label="Final script"
              onChangeText={setFinalScript}
              placeholder="Runs after repositories are set up"
              value={finalScript}
            />
            <ScriptField
              label="Development script"
              onChangeText={setDevScript}
              placeholder="Starts the development environment"
              value={devScript}
            />
          </FormSection>

          <FormSection title="Additional services">
            <ProjectServicesConfig
              disabled={isSaving}
              onChange={setServicesConfig}
              value={servicesConfig}
            />
          </FormSection>

          {errors.length ? (
            <View style={styles.errorCard}>
              <ThemedText style={styles.errorTitle}>
                Fix the following before {isEditing ? "saving" : "creating"}:
              </ThemedText>
              {errors.map((error) => (
                <ThemedText key={error} style={styles.errorText}>
                  • {error}
                </ThemedText>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={goBack}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.secondaryButtonLabel}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.text },
                pressed && styles.pressed,
                isSaving && styles.disabled,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color={theme.background} size="small" />
              ) : null}
              <ThemedText
                style={[styles.primaryButtonLabel, { color: theme.background }]}
              >
                {isSaving
                  ? isEditing
                    ? "Saving…"
                    : "Creating…"
                  : isEditing
                    ? "Save changes"
                    : "Create project"}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ConnectGithubRepoDrawer
        onClose={() => setIsRepoDrawerOpen(false)}
        visible={isRepoDrawerOpen}
      />
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}
    >
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [
          styles.headerButton,
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{ ios: "chevron.left", android: "arrow_back" }}
          size={21}
          tintColor={theme.text}
        />
      </Pressable>
      <ThemedText style={styles.headerTitle}>{title}</ThemedText>
      <View style={styles.headerButton} />
    </View>
  );
}

function LoadingState({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <View style={styles.centeredState}>
        <ActivityIndicator color={theme.textSecondary} />
        <ThemedText themeColor="textSecondary">{label}</ThemedText>
      </View>
    </SafeAreaView>
  );
}

function FormSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.section, { borderBottomColor: theme.backgroundSelected }]}
    >
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function FormField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label} themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

function FormInput({
  style,
  ...props
}: React.ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
          color: theme.text,
        },
        style,
      ]}
      textAlignVertical={props.multiline ? "top" : "center"}
    />
  );
}

function ScriptField({
  label,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <FormField label={label}>
      <FormInput
        autoCapitalize="none"
        maxLength={500}
        multiline
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.scriptInput}
        value={value}
      />
    </FormField>
  );
}

function ChoiceField({
  disabled,
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (id: string) => void;
  options: Choice[];
  placeholder: string;
  value: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);
  return (
    <FormField label={label}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.choice,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <ThemedText
          numberOfLines={1}
          style={styles.choiceText}
          themeColor={selected ? "text" : "textSecondary"}
        >
          {selected?.label ?? placeholder}
        </ThemedText>
        <SymbolView
          name={{ ios: "chevron.up.chevron.down", android: "unfold_more" }}
          size={15}
          tintColor={theme.textSecondary}
        />
      </Pressable>
      <ChoiceModal
        label={label}
        onChange={onChange}
        onClose={() => setOpen(false)}
        open={open}
        options={options}
        value={value}
      />
    </FormField>
  );
}

function ChoiceModal({
  label,
  onChange,
  onClose,
  open,
  options,
  value,
}: {
  label: string;
  onChange: (id: string) => void;
  onClose: () => void;
  open: boolean;
  options: Choice[];
  value: string;
}) {
  const theme = useTheme();
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={open}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close choices"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          <ThemedText style={styles.modalTitle}>{label}</ThemedText>
          <ScrollView style={styles.modalList}>
            {options.map((option) => {
              const selected = option.id === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={option.id}
                  onPress={() => {
                    onChange(option.id);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.modalOption,
                    selected && { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.modalOptionLabel}>
                    {option.label}
                  </ThemedText>
                  {selected ? (
                    <SymbolView
                      name={{ ios: "checkmark", android: "check" }}
                      size={17}
                      tintColor={theme.text}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SelectableGroup({
  actionLabel,
  emptyLabel,
  icon,
  isLoading,
  label,
  layout = "chips",
  onAction,
  onToggle,
  options,
  selectedIds,
}: {
  actionLabel?: string;
  emptyLabel: string;
  icon: SymbolViewProps["name"];
  isLoading: boolean;
  label: string;
  layout?: "chips" | "list";
  onAction?: () => void;
  onToggle: (id: string) => void;
  options: Choice[];
  selectedIds: string[];
}) {
  const theme = useTheme();
  return (
    <View style={styles.selectableGroup}>
      <View style={styles.selectableHeader}>
        <View style={styles.selectableTitle}>
          <SymbolView name={icon} size={16} tintColor={theme.textSecondary} />
          <ThemedText style={styles.subheading}>{label}</ThemedText>
        </View>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction}>
            <ThemedText style={styles.linkLabel}>{actionLabel}</ThemedText>
          </Pressable>
        ) : null}
      </View>
      {isLoading ? (
        <ActivityIndicator />
      ) : options.length ? (
        <View style={layout === "list" ? styles.optionList : styles.chips}>
          {options.map((option) => {
            const selected = selectedIds.includes(option.id);
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                key={option.id}
                onPress={() => onToggle(option.id)}
                style={({ pressed }) => [
                  styles.chip,
                  layout === "list" && styles.listOption,
                  {
                    borderColor: selected
                      ? theme.text
                      : theme.backgroundSelected,
                    backgroundColor: selected
                      ? theme.backgroundElement
                      : "transparent",
                  },
                  pressed && styles.pressed,
                ]}
              >
                {selected ? (
                  <SymbolView
                    name={{ ios: "checkmark", android: "check" }}
                    size={13}
                    tintColor={theme.text}
                  />
                ) : null}
                <ThemedText
                  numberOfLines={layout === "list" ? 1 : undefined}
                  style={[
                    styles.chipLabel,
                    layout === "list" && styles.listOptionLabel,
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <ThemedText style={styles.emptyCopy} themeColor="textSecondary">
          {emptyLabel}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 54,
    paddingHorizontal: 14,
  },
  headerButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    width: 42,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  content: { paddingBottom: 44, paddingHorizontal: 20 },
  section: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionContent: { gap: 16, marginTop: 18 },
  subheading: { fontSize: 14, fontWeight: "700" },
  subheadingSpacing: { marginTop: 8 },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: "600" },
  input: {
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  multilineInput: { minHeight: 84 },
  scriptInput: { fontFamily: Fonts.mono, fontSize: 12, minHeight: 104 },
  choice: {
    alignItems: "center",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  choiceText: { flex: 1, fontSize: 14 },
  selectableGroup: { gap: 11 },
  selectableHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  selectableTitle: { alignItems: "center", flexDirection: "row", gap: 7 },
  linkLabel: { color: "#3b82f6", fontSize: 13, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionList: { gap: 8 },
  chip: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  chipLabel: { fontSize: 12, fontWeight: "600" },
  listOption: {
    minHeight: 44,
    width: "100%",
  },
  listOptionLabel: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 13,
  },
  emptyCopy: { fontSize: 13, lineHeight: 19 },
  errorCard: {
    backgroundColor: "rgba(239,68,68,0.10)",
    borderColor: "rgba(239,68,68,0.35)",
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    marginTop: 20,
    padding: 14,
  },
  errorTitle: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  errorText: { color: "#ef4444", fontSize: 13, lineHeight: 19 },
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    paddingTop: 24,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  secondaryButtonLabel: { fontSize: 14, fontWeight: "700" },
  primaryButton: {
    alignItems: "center",
    borderRadius: 11,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  primaryButtonLabel: { fontSize: 14, fontWeight: "700" },
  centeredState: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 24,
  },
  stateTitle: { fontSize: 17, fontWeight: "700" },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.48 },
  modalRoot: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.38)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "70%",
    maxWidth: 520,
    padding: 8,
    width: "100%",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  modalList: { flexGrow: 0 },
  modalOption: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 11,
  },
  modalOptionLabel: { flex: 1, fontSize: 14 },
});
