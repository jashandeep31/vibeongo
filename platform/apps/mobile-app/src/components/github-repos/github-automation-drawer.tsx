import type { GithubRepo } from "@repo/api-client";
import { useGetProjects, useUpdateGithubRepoAutomation } from "@repo/api-hooks";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

const NO_DEFAULT_PROJECT = "__none__";

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string")
      return response.data.message;
  }
  return "Failed to update repository settings.";
}

export function GithubAutomationDrawer({
  onClose,
  repo,
}: {
  onClose: () => void;
  repo: GithubRepo | null;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const visible = Boolean(repo);
  const projectsQuery = useGetProjects(visible);
  const updateAutomation = useUpdateGithubRepoAutomation();
  const [autoReviewPullRequests, setAutoReviewPullRequests] = useState(false);
  const [autoFixIssues, setAutoFixIssues] = useState(false);
  const [defaultProjectId, setDefaultProjectId] = useState(NO_DEFAULT_PROJECT);

  useEffect(() => {
    if (!repo) return;
    setAutoReviewPullRequests(repo.auto_review_pull_requests_enabled);
    setAutoFixIssues(repo.auto_fix_issues_enabled);
    setDefaultProjectId(repo.default_project_id ?? NO_DEFAULT_PROJECT);
  }, [repo]);

  const normalizedProjectId =
    defaultProjectId === NO_DEFAULT_PROJECT ? null : defaultProjectId;
  const hasChanges = Boolean(
    repo &&
    (autoReviewPullRequests !== repo.auto_review_pull_requests_enabled ||
      autoFixIssues !== repo.auto_fix_issues_enabled ||
      normalizedProjectId !== repo.default_project_id),
  );

  const close = () => {
    if (!updateAutomation.isPending) onClose();
  };

  const save = async () => {
    if (!repo || !hasChanges || updateAutomation.isPending) return;
    try {
      await updateAutomation.mutateAsync({
        id: repo.id,
        setup_script: repo.setup_script,
        default_project_id: normalizedProjectId,
        auto_review_pull_requests_enabled: autoReviewPullRequests,
        auto_fix_issues_enabled: autoFixIssues,
      });
      onClose();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not save repository settings",
        text2: getErrorMessage(error),
      });
    }
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close repository settings"
          accessibilityRole="button"
          onPress={close}
          style={styles.backdrop}
        />
        <BottomDrawerPanel
          accessibilityViewIsModal
          style={[
            styles.drawer,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          visible={visible}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.title}>Repository automation</ThemedText>
            <ThemedText style={styles.description} themeColor="textSecondary">
              Choose which GitHub events automatically start an AI task for
              {repo ? ` ${repo.full_name}.` : " this repository."}
            </ThemedText>

            <View
              style={[
                styles.section,
                { borderColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText style={styles.sectionTitle}>
                Default project
              </ThemedText>
              <ThemedText style={styles.sectionCopy} themeColor="textSecondary">
                AI reviews and fixes run inside this project.
              </ThemedText>
              {projectsQuery.isPending ? (
                <View style={styles.loadingProjects}>
                  <ActivityIndicator size="small" />
                  <ThemedText themeColor="textSecondary">
                    Loading projects…
                  </ThemedText>
                </View>
              ) : projectsQuery.isError ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void projectsQuery.refetch()}
                  style={styles.loadingProjects}
                >
                  <ThemedText style={styles.error}>
                    Could not load projects
                  </ThemedText>
                  <ThemedText style={styles.retry}>Try again</ThemedText>
                </Pressable>
              ) : (
                <View style={styles.projectOptions}>
                  <ProjectOption
                    label="No default project"
                    onPress={() => setDefaultProjectId(NO_DEFAULT_PROJECT)}
                    selected={defaultProjectId === NO_DEFAULT_PROJECT}
                  />
                  {(projectsQuery.data ?? []).map((project) => (
                    <ProjectOption
                      key={project.id}
                      label={project.name}
                      onPress={() => setDefaultProjectId(project.id)}
                      selected={defaultProjectId === project.id}
                    />
                  ))}
                </View>
              )}
            </View>

            <AutomationSwitch
              description="Start an AI review when a pull request is opened."
              disabled={updateAutomation.isPending}
              label="Auto-review pull requests"
              onValueChange={setAutoReviewPullRequests}
              value={autoReviewPullRequests}
            />
            <AutomationSwitch
              description="Start an AI fix when a new issue is opened."
              disabled={updateAutomation.isPending}
              label="Auto-fix issues"
              onValueChange={setAutoFixIssues}
              value={autoFixIssues}
            />

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={updateAutomation.isPending}
                onPress={close}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.actionLabel}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled: !hasChanges || updateAutomation.isPending,
                }}
                disabled={!hasChanges || updateAutomation.isPending}
                onPress={() => void save()}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: theme.text },
                  (!hasChanges || updateAutomation.isPending) &&
                    styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {updateAutomation.isPending ? (
                  <ActivityIndicator color={theme.background} size="small" />
                ) : (
                  <ThemedText
                    style={[styles.actionLabel, { color: theme.background }]}
                  >
                    Save settings
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </BottomDrawerPanel>
      </View>
    </Modal>
  );
}

function ProjectOption({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.projectOption,
        selected && { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.radio,
          { borderColor: selected ? theme.text : theme.textSecondary },
        ]}
      >
        {selected ? (
          <View style={[styles.radioFill, { backgroundColor: theme.text }]} />
        ) : null}
      </View>
      <ThemedText numberOfLines={1} style={styles.projectLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function AutomationSwitch({
  description,
  disabled,
  label,
  onValueChange,
  value,
}: {
  description: string;
  disabled: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.switchRow, { borderColor: theme.backgroundSelected }]}>
      <View style={styles.switchCopy}>
        <ThemedText style={styles.switchLabel}>{label}</ThemedText>
        <ThemedText style={styles.sectionCopy} themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      <Switch disabled={disabled} onValueChange={onValueChange} value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: 11,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  actionLabel: { fontSize: 14, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  description: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  disabled: { opacity: 0.4 },
  drawer: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: "92%",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  error: { color: "#ef4444", fontSize: 13 },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 18,
    width: 38,
  },
  loadingProjects: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.7 },
  projectLabel: { flex: 1, fontSize: 14 },
  projectOption: {
    alignItems: "center",
    borderRadius: 9,
    flexDirection: "row",
    gap: 10,
    minHeight: 42,
    paddingHorizontal: 8,
  },
  projectOptions: { marginTop: 8 },
  radio: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  radioFill: { borderRadius: 5, height: 10, width: 10 },
  retry: { fontSize: 13, fontWeight: "700" },
  root: { flex: 1, justifyContent: "flex-end" },
  section: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 20,
    padding: 14,
  },
  sectionCopy: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  switchCopy: { flex: 1 },
  switchLabel: { fontSize: 14, fontWeight: "700" },
  switchRow: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 15,
    marginTop: 12,
    minHeight: 76,
    padding: 14,
  },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
});
