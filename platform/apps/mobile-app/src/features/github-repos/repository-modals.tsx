import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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

import {
  createGithubRepo,
  getProjects,
  updateGithubRepoAutomation,
  type GithubRepo,
  type ProjectOption,
} from "./github-repos-api";

function ModalHeader({
  colors,
  onClose,
  subtitle,
  title,
}: {
  colors: AppColors;
  onClose: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <View style={styles.headerCopy}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={`Close ${title}`}
        accessibilityRole="button"
        onPress={onClose}
        style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
      >
        <AppIcon
          name={{ ios: "xmark", android: "close", web: "close" }}
          size={19}
          tintColor={colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

export function ConnectRepositoryModal({
  colors,
  onAdded,
  onClose,
  visible,
}: {
  colors: AppColors;
  onAdded: () => void;
  onClose: () => void;
  visible: boolean;
}) {
  const [url, setUrl] = useState("");
  const [setupScript, setSetupScript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const close = () => {
    if (isSubmitting) return;
    setUrl("");
    setSetupScript("");
    setError(null);
    onClose();
  };

  const submit = async () => {
    const normalizedUrl = normalizeGithubUrl(url);
    if (!normalizedUrl) {
      setError("Enter a GitHub URL like https://github.com/owner/repository.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await createGithubRepo({
        url: normalizedUrl,
        setup_script: setupScript.trim(),
      });
      setUrl("");
      setSetupScript("");
      onAdded();
      onClose();
      Alert.alert("GitHub repository added");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not add this repository. Check that the GitHub App has access.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView
        style={[styles.modalRoot, { backgroundColor: colors.background }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <ModalHeader
            colors={colors}
            onClose={close}
            subtitle="Connect a repository that your installed VibeOnGo GitHub App can access."
            title="Add GitHub repository"
          />
          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            <FieldLabel colors={colors}>Repository URL</FieldLabel>
            <TextInput
              accessibilityLabel="Repository URL"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              keyboardType="url"
              onChangeText={setUrl}
              placeholder="https://github.com/owner/repository"
              placeholderTextColor={colors.textSecondary}
              selectionColor={colors.brand}
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={url}
            />

            <FieldLabel colors={colors}>Setup script (optional)</FieldLabel>
            <TextInput
              accessibilityLabel="Setup script"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              multiline
              onChangeText={setSetupScript}
              placeholder="npm install"
              placeholderTextColor={colors.textSecondary}
              selectionColor={colors.brand}
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              textAlignVertical="top"
              value={setupScript}
            />

            {error ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.error, { color: colors.destructive }]}
              >
                {error}
              </Text>
            ) : null}
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <SecondaryButton
              colors={colors}
              disabled={isSubmitting}
              label="Cancel"
              onPress={close}
            />
            <PrimaryButton
              colors={colors}
              disabled={isSubmitting}
              label={isSubmitting ? "Adding…" : "Add repository"}
              loading={isSubmitting}
              onPress={() => void submit()}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export function AutomationSettingsModal({
  colors,
  onClose,
  onSaved,
  repo,
  visible,
}: {
  colors: AppColors;
  onClose: () => void;
  onSaved: () => void;
  repo: GithubRepo | null;
  visible: boolean;
}) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);
  const [autoReview, setAutoReview] = useState(false);
  const [autoFix, setAutoFix] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !repo) return;
    setDefaultProjectId(repo.default_project_id);
    setAutoReview(repo.auto_review_pull_requests_enabled);
    setAutoFix(repo.auto_fix_issues_enabled);
    setError(null);
    setIsLoading(true);
    const controller = new AbortController();
    void getProjects(controller.signal)
      .then(setProjects)
      .catch((loadError) => {
        if (loadError instanceof Error && loadError.name === "AbortError")
          return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load projects.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [repo, visible]);

  const hasChanges = useMemo(
    () =>
      Boolean(repo) &&
      (defaultProjectId !== repo?.default_project_id ||
        autoReview !== repo?.auto_review_pull_requests_enabled ||
        autoFix !== repo?.auto_fix_issues_enabled),
    [autoFix, autoReview, defaultProjectId, repo],
  );

  const save = async () => {
    if (!repo || !hasChanges || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateGithubRepoAutomation(repo, {
        default_project_id: defaultProjectId,
        auto_review_pull_requests_enabled: autoReview,
        auto_fix_issues_enabled: autoFix,
      });
      onSaved();
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => !isSaving && onClose()}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView
        style={[styles.modalRoot, { backgroundColor: colors.background }]}
      >
        <ModalHeader
          colors={colors}
          onClose={() => !isSaving && onClose()}
          subtitle={`Choose which GitHub events should start an AI task for ${repo?.full_name ?? "this repository"}.`}
          title="Repository automation"
        />
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Default project
          </Text>
          <Text style={[styles.help, { color: colors.textSecondary }]}>
            AI reviews and fixes will run inside this project.
          </Text>
          <View style={[styles.optionGroup, { borderColor: colors.border }]}>
            {isLoading ? (
              <ActivityIndicator color={colors.brand} style={styles.loader} />
            ) : (
              [{ id: null, name: "No default project" }, ...projects].map(
                (project, index) => {
                  const selected = defaultProjectId === project.id;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      disabled={isSaving}
                      key={project.id ?? "none"}
                      onPress={() => setDefaultProjectId(project.id)}
                      style={({ pressed }) => [
                        styles.option,
                        index > 0 && {
                          borderTopColor: colors.border,
                          borderTopWidth: StyleSheet.hairlineWidth,
                        },
                        selected && {
                          backgroundColor: colors.backgroundSelected,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.optionText, { color: colors.text }]}>
                        {project.name}
                      </Text>
                      {selected ? (
                        <AppIcon
                          name={{
                            ios: "checkmark.circle.fill",
                            android: "check_circle",
                            web: "check_circle",
                          }}
                          size={20}
                          tintColor={colors.brand}
                        />
                      ) : null}
                    </Pressable>
                  );
                },
              )
            )}
          </View>

          <ToggleRow
            colors={colors}
            description="Start an AI review when a pull request is opened."
            disabled={isSaving}
            label="Auto-review pull requests"
            onValueChange={setAutoReview}
            value={autoReview}
          />
          <ToggleRow
            colors={colors}
            description="Start an AI fix when a new issue is opened."
            disabled={isSaving}
            label="Auto-fix issues"
            onValueChange={setAutoFix}
            value={autoFix}
          />

          {error ? (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <SecondaryButton
            colors={colors}
            disabled={isSaving}
            label="Cancel"
            onPress={onClose}
          />
          <PrimaryButton
            colors={colors}
            disabled={!hasChanges || isSaving || isLoading}
            label={isSaving ? "Saving…" : "Save settings"}
            loading={isSaving}
            onPress={() => void save()}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ToggleRow({
  colors,
  description,
  disabled,
  label,
  onValueChange,
  value,
}: {
  colors: AppColors;
  description: string;
  disabled: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View
      style={[
        styles.toggleRow,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.toggleCopy}>
        <Text style={[styles.optionText, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.help, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: colors.backgroundSelected, true: colors.brand }}
        value={value}
      />
    </View>
  );
}

function FieldLabel({
  children,
  colors,
}: {
  children: string;
  colors: AppColors;
}) {
  return (
    <Text style={[styles.fieldLabel, { color: colors.text }]}>{children}</Text>
  );
}

function PrimaryButton({
  colors,
  disabled,
  label,
  loading,
  onPress,
}: {
  colors: AppColors;
  disabled: boolean;
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: colors.primary },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primaryForeground} size="small" />
      ) : null}
      <Text
        style={[styles.primaryButtonText, { color: colors.primaryForeground }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SecondaryButton({
  colors,
  disabled,
  label,
  onPress,
}: {
  colors: AppColors;
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        { borderColor: colors.border },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function normalizeGithubUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (
      parsed.protocol !== "https:" ||
      !["github.com", "www.github.com"].includes(
        parsed.hostname.toLowerCase(),
      ) ||
      parts.length !== 2
    ) {
      return null;
    }
    const repository = parts[1]?.replace(/\.git$/, "");
    if (!parts[0] || !repository) return null;
    return `https://github.com/${parts[0]}/${repository}`;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    height: TouchTarget,
    justifyContent: "center",
    width: TouchTarget,
  },
  disabled: { opacity: 0.45 },
  error: { fontSize: 13, lineHeight: 19 },
  fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: -Spacing.two },
  flex: { flex: 1 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.three,
    justifyContent: "flex-end",
    padding: Spacing.four,
  },
  form: {
    gap: Spacing.four,
    padding: Spacing.five,
    paddingBottom: Spacing.eight,
  },
  header: {
    alignItems: "flex-start",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.three,
    padding: Spacing.five,
  },
  headerCopy: { flex: 1, gap: Spacing.one },
  help: { fontSize: 12, lineHeight: 18 },
  input: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    fontSize: 15,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  loader: { margin: Spacing.five },
  modalRoot: { flex: 1 },
  option: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  optionGroup: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    overflow: "hidden",
  },
  optionText: { fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.6 },
  primaryButton: {
    alignItems: "center",
    borderRadius: Radius.medium,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.five,
  },
  primaryButtonText: { fontSize: 14, fontWeight: "700" },
  secondaryButton: {
    alignItems: "center",
    borderRadius: Radius.medium,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.five,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: "600" },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  subtitle: { fontSize: 13, lineHeight: 19 },
  textArea: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    minHeight: 110,
  },
  title: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
  toggleCopy: { flex: 1, gap: Spacing.one },
  toggleRow: {
    alignItems: "center",
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.four,
    padding: Spacing.four,
  },
});
