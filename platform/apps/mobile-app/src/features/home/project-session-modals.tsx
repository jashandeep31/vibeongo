import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import {
  Radius,
  Spacing,
  TouchTarget,
  type AppColors,
} from "@/constants/theme";
import { useToast } from "@/contexts/toast-context";

import {
  createProject,
  getInstanceRegions,
  getInstanceTypes,
  getSandboxRegions,
  getSandboxTypes,
  type RuntimeRegion,
  type RuntimeType,
  type SandboxRegion,
} from "./home-api";

import type {
  Project,
  ProjectGithubRepo,
  ProjectSession,
  ProjectSessionRuntimeKind,
} from "./types";

function Sheet({
  children,
  colors,
  onClose,
  title,
  visible,
}: {
  children: React.ReactNode;
  colors: AppColors;
  onClose: () => void;
  title: string;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalRoot}
      >
        <Pressable
          onPress={onClose}
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        />
        <SafeAreaView
          edges={["bottom"]}
          style={[styles.sheet, { backgroundColor: colors.surface }]}
        >
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {title}
            </Text>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.iconButton}
            >
              <AppIcon
                name={{ ios: "xmark", android: "close", web: "close" }}
                size={19}
                tintColor={colors.textSecondary}
              />
            </Pressable>
          </View>
          {children}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function CreateProjectSheet({
  colors,
  onClose,
  onCreated,
  visible,
}: {
  colors: AppColors;
  onClose: () => void;
  onCreated: () => void;
  visible: boolean;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState<RuntimeRegion | null>(null);
  const [instanceType, setInstanceType] = useState<RuntimeType | null>(null);
  const [sandboxRegion, setSandboxRegion] = useState<SandboxRegion | null>(null);
  const [sandboxType, setSandboxType] = useState<RuntimeType | null>(null);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    setIsLoadingDefaults(true);
    setLoadError(null);
    void Promise.all([
      getInstanceRegions(controller.signal),
      getSandboxRegions(controller.signal),
    ])
      .then(async ([regions, sandboxRegions]) => {
        const nextRegion = regions[0];
        const nextSandboxRegion = sandboxRegions[0];
        if (!nextRegion || !nextSandboxRegion) {
          throw new Error("No project runtimes are available.");
        }
        const [instanceTypes, sandboxTypes] = await Promise.all([
          getInstanceTypes(nextRegion.id, controller.signal),
          getSandboxTypes(nextSandboxRegion.id, controller.signal),
        ]);
        if (!instanceTypes[0] || !sandboxTypes[0]) {
          throw new Error("No compatible runtime size is available.");
        }
        setRegion(nextRegion);
        setInstanceType(instanceTypes[0]);
        setSandboxRegion(nextSandboxRegion);
        setSandboxType(sandboxTypes[0]);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Could not load runtimes.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingDefaults(false);
      });
    return () => controller.abort();
  }, [visible]);

  const submit = async () => {
    const projectName = name.trim();
    if (projectName.length < 3 || projectName.length > 20) {
      showToast({
        message: "Use between 3 and 20 characters.",
        title: "Invalid project name",
        variant: "error",
      });
      return;
    }
    if (!region || !instanceType || !sandboxType) {
      showToast({
        message: loadError ?? "Wait for the runtime defaults to load.",
        title: "Runtime unavailable",
        variant: "error",
      });
      return;
    }

    setIsCreating(true);
    try {
      await createProject({
        description: description.trim(),
        instanceTypeId: instanceType.id,
        name: projectName,
        provider: region.provider,
        regionId: region.id,
        sandboxTypeId: sandboxType.id,
      });
      setName("");
      setDescription("");
      showToast({
        message: `${projectName} is ready with a default session.`,
        title: "Project created",
        variant: "success",
      });
      onCreated();
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Please try again.",
        title: "Could not create project",
        variant: "error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const canSubmit =
    name.trim().length >= 3 &&
    name.trim().length <= 20 &&
    Boolean(region && instanceType && sandboxType) &&
    !isCreating;

  return (
    <Sheet colors={colors} onClose={onClose} title="Create project" visible={visible}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={[styles.description, { color: colors.textSecondary }]}>A default session and recommended runtimes are configured automatically.</Text>
        <Text style={[styles.label, { color: colors.text }]}>Project name</Text>
        <TextInput
          autoFocus
          editable={!isCreating}
          maxLength={20}
          onChangeText={setName}
          placeholder="My project"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
          ]}
          value={name}
        />
        {name.length > 0 && name.trim().length < 3 ? (
          <Text style={[styles.validation, { color: colors.destructive }]}>At least 3 characters.</Text>
        ) : null}

        <Text style={[styles.label, { color: colors.text }]}>Description (optional)</Text>
        <TextInput
          editable={!isCreating}
          multiline
          onChangeText={setDescription}
          placeholder="What is this project for?"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            styles.projectDescription,
            { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
          ]}
          textAlignVertical="top"
          value={description}
        />

        <View style={[styles.runtimeSummary, { backgroundColor: colors.backgroundElement }]}> 
          {isLoadingDefaults ? (
            <View style={styles.runtimeLoading}>
              <ActivityIndicator color={colors.brand} size="small" />
              <Text style={[styles.runtimeSummaryText, { color: colors.textSecondary }]}>Choosing recommended runtimes…</Text>
            </View>
          ) : loadError ? (
            <Text style={[styles.runtimeSummaryText, { color: colors.destructive }]}>{loadError}</Text>
          ) : (
            <>
              <Text style={[styles.runtimeSummaryLabel, { color: colors.textSecondary }]}>RUNTIME DEFAULTS</Text>
              <Text style={[styles.runtimeSummaryText, { color: colors.text }]}>VM · {region?.name} · {instanceType?.name}</Text>
              <Text style={[styles.runtimeSummaryText, { color: colors.text }]}>Sandbox · {sandboxRegion?.provider.toUpperCase()} · {sandboxType?.name}</Text>
            </>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={() => void submit()}
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary },
            !canSubmit && styles.disabled,
          ]}
        >
          {isCreating ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>Create project</Text>
          )}
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

export function NewSessionSheet({
  colors,
  isPending,
  onClose,
  onSubmit,
  project,
}: {
  colors: AppColors;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
  project: Project | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (project) return;
    setName("");
    setDescription("");
  }, [project]);

  return (
    <Sheet
      colors={colors}
      onClose={onClose}
      title="New project session"
      visible={Boolean(project)}
    >
      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Create a paused session for {project?.name}. You can choose a runtime
          when you resume it.
        </Text>
        <Text style={[styles.label, { color: colors.text }]}>Session name</Text>
        <TextInput
          autoFocus
          editable={!isPending}
          onChangeText={setName}
          placeholder="e.g. Implement command palette"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            {
              backgroundColor: colors.input,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          value={name}
        />
        {name.length > 0 && name.trim().length < 4 ? (
          <Text style={[styles.validation, { color: colors.destructive }]}>
            Session name must be at least 4 characters.
          </Text>
        ) : null}
        <Text style={[styles.label, { color: colors.text }]}>
          Description (optional)
        </Text>
        <TextInput
          editable={!isPending}
          multiline
          onChangeText={setDescription}
          placeholder="What will this session be used for?"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            styles.textarea,
            {
              backgroundColor: colors.input,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          textAlignVertical="top"
          value={description}
        />
        <Pressable
          accessibilityRole="button"
          disabled={isPending || name.trim().length < 4}
          onPress={() => onSubmit(name.trim(), description.trim())}
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary },
            (isPending || name.trim().length < 4) && styles.disabled,
          ]}
        >
          {isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text
              style={[styles.primaryText, { color: colors.primaryForeground }]}
            >
              Create session
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

export function RuntimeSheet({
  colors,
  isPending,
  onClose,
  onSelect,
  session,
}: {
  colors: AppColors;
  isPending: boolean;
  onClose: () => void;
  onSelect: (runtime: ProjectSessionRuntimeKind) => void;
  session: ProjectSession | null;
}) {
  return (
    <Sheet
      colors={colors}
      onClose={onClose}
      title="Choose a runtime"
      visible={Boolean(session)}
    >
      <View style={styles.form}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Select where {session?.name} should run. The provider and size come
          from the project configuration.
        </Text>
        {(
          [
            [
              "vm",
              "Virtual machine",
              "Launch on the configured cloud instance.",
              { ios: "cloud", android: "cloud", web: "cloud" },
            ],
            [
              "sandbox",
              "Sandbox",
              "Launch in the configured isolated sandbox.",
              {
                ios: "shippingbox",
                android: "inventory_2",
                web: "inventory_2",
              },
            ],
          ] as const
        ).map(([value, title, copy, icon]) => (
          <Pressable
            accessibilityRole="button"
            disabled={isPending}
            key={value}
            onPress={() => onSelect(value)}
            style={({ pressed }) => [
              styles.runtimeCard,
              { borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.runtimeIcon,
                { backgroundColor: colors.backgroundElement },
              ]}
            >
              <AppIcon name={icon} size={21} tintColor={colors.text} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.runtimeTitle, { color: colors.text }]}>
                {title}
              </Text>
              <Text
                style={[styles.runtimeCopy, { color: colors.textSecondary }]}
              >
                {copy}
              </Text>
            </View>
            {isPending ? (
              <ActivityIndicator color={colors.brand} size="small" />
            ) : (
              <AppIcon
                name={{
                  ios: "chevron.right",
                  android: "chevron_right",
                  web: "chevron_right",
                }}
                size={18}
                tintColor={colors.textSecondary}
              />
            )}
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

export function RepositorySheet({
  colors,
  error,
  isLoading,
  onClose,
  onRetry,
  onSelect,
  repos,
  session,
}: {
  colors: AppColors;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
  onRetry: () => void;
  onSelect: (repo: ProjectGithubRepo) => void;
  repos: ProjectGithubRepo[];
  session: ProjectSession | null;
}) {
  return (
    <Sheet
      colors={colors}
      onClose={onClose}
      title="Choose a repository"
      visible={Boolean(session)}
    >
      <View style={styles.form}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Choose the repository directory for the new chat.
        </Text>
        {isLoading ? (
          <ActivityIndicator color={colors.brand} style={styles.loader} />
        ) : error ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={[styles.runtimeCard, { borderColor: colors.border }]}
          >
            <Text style={[styles.runtimeCopy, { color: colors.destructive }]}>
              {error} Tap to retry.
            </Text>
          </Pressable>
        ) : repos.length === 0 ? (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            No repositories are linked to this project.
          </Text>
        ) : (
          repos.map((repo) => {
            const name =
              repo.full_name.split("/").filter(Boolean).at(-1) ??
              repo.full_name;
            return (
              <Pressable
                key={repo.id}
                accessibilityRole="button"
                onPress={() => onSelect(repo)}
                style={({ pressed }) => [
                  styles.runtimeCard,
                  { borderColor: colors.border },
                  pressed && styles.pressed,
                ]}
              >
                <AppIcon
                  name={{ ios: "folder", android: "folder", web: "folder" }}
                  size={20}
                  tintColor={colors.brand}
                />
                <View style={styles.flex}>
                  <Text
                    numberOfLines={1}
                    style={[styles.runtimeTitle, { color: colors.text }]}
                  >
                    {repo.full_name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.runtimeCopy,
                      { color: colors.textSecondary },
                    ]}
                  >
                    /home/ubuntu/code/{name}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    maxHeight: "88%",
    paddingBottom: Spacing.four,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    height: 62,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.five,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  iconButton: {
    alignItems: "center",
    height: TouchTarget,
    justifyContent: "center",
    width: TouchTarget,
  },
  form: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.five,
  },
  description: { fontSize: 13, lineHeight: 19, marginBottom: Spacing.two },
  label: { fontSize: 13, fontWeight: "600", marginTop: Spacing.two },
  input: {
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  textarea: { minHeight: 94 },
  projectDescription: { minHeight: 82 },
  validation: { fontSize: 12 },
  runtimeSummary: { borderRadius: Radius.medium, gap: 5, marginTop: Spacing.two, padding: Spacing.four },
  runtimeLoading: { alignItems: "center", flexDirection: "row", gap: Spacing.three },
  runtimeSummaryLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  runtimeSummaryText: { fontSize: 12, lineHeight: 18 },
  primaryButton: {
    alignItems: "center",
    borderRadius: Radius.pill,
    height: 48,
    justifyContent: "center",
    marginTop: Spacing.three,
  },
  primaryText: { fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  runtimeCard: {
    alignItems: "center",
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 74,
    padding: Spacing.four,
  },
  runtimeIcon: {
    alignItems: "center",
    borderRadius: Radius.medium,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  runtimeTitle: { fontSize: 14, fontWeight: "700" },
  runtimeCopy: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  flex: { flex: 1, minWidth: 0 },
  loader: { marginVertical: Spacing.seven },
  pressed: { opacity: 0.55 },
});
