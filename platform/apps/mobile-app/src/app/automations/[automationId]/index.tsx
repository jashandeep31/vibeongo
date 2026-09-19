import type { GetProjectAutomationTriggersResponse } from "@repo/api-client";
import {
  useDeleteProjectAutomation,
  useGetProjectAutomation,
  useGetProjectAutomationRuns,
  useGetProjectAutomationTriggers,
  useTriggerProjectAutomation,
} from "@repo/api-hooks";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { AutomationRunCard } from "@/components/automations/automation-run-card";
import { AutomationTriggerDrawer } from "@/components/automations/automation-trigger-drawer";
import {
  formatAutomationDate,
  getApiErrorMessage,
  scheduleLabel,
} from "@/components/automations/automation-utils";
import { ConfirmationDrawer } from "@/components/confirmation-drawer";
import { PageChromeLayout, PageHeader } from "@/components/page-chrome";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

type Trigger = GetProjectAutomationTriggersResponse["triggers"][number];
type DetailsTab = "integrations" | "tasks" | "runs";

export default function AutomationDetailsScreen() {
  const params = useLocalSearchParams<{ automationId?: string | string[] }>();
  const automationId =
    typeof params.automationId === "string" ? params.automationId : null;
  const router = useRouter();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<DetailsTab>("integrations");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteAutomationOpen, setDeleteAutomationOpen] = useState(false);
  const automationQuery = useGetProjectAutomation(automationId);
  const runsQuery = useGetProjectAutomationRuns(automationId, {
    page,
    limit: 10,
  });
  const triggersQuery = useGetProjectAutomationTriggers(automationId);
  const triggerAutomation = useTriggerProjectAutomation();
  const deleteAutomation = useDeleteProjectAutomation();

  const toastError = (title: string, error: unknown) =>
    Toast.show({
      type: "error",
      text1: title,
      text2: getApiErrorMessage(error, "Try again."),
    });
  const refresh = async () => {
    await Promise.all([
      automationQuery.refetch(),
      runsQuery.refetch(),
      triggersQuery.refetch(),
    ]);
  };
  const run = async () => {
    if (!automationId) return;
    try {
      const response = await triggerAutomation.mutateAsync(automationId);
      Toast.show({ type: "success", text1: response.message });
    } catch (error) {
      toastError("Could not trigger automation", error);
    }
  };
  const removeAutomation = async () => {
    if (!automationId) return;
    try {
      const response = await deleteAutomation.mutateAsync(automationId);
      Toast.show({ type: "success", text1: response.message });
      setDeleteAutomationOpen(false);
      router.replace("/automations" as never);
    } catch (error) {
      toastError("Could not delete automation", error);
    }
  };

  if (automationQuery.isPending)
    return (
      <ScreenState>
        <ActivityIndicator />
        <ThemedText themeColor="textSecondary">Loading automation…</ThemedText>
      </ScreenState>
    );
  if (automationQuery.isError || !automationQuery.data || !automationId)
    return (
      <ScreenState>
        <ThemedText style={styles.errorTitle}>
          Automation could not be loaded
        </ThemedText>
        <ThemedText style={styles.centerCopy} themeColor="textSecondary">
          It may have been removed, or you may not have access to it.
        </ThemedText>
        <SmallButton label="Go back" onPress={() => router.back()} />
      </ScreenState>
    );

  const { project_automation: automation, tasks } = automationQuery.data;
  const triggers = triggersQuery.data?.triggers ?? [];
  const runs = runsQuery.data?.runs ?? [];
  const currentPage = runsQuery.data?.page ?? page;
  const refreshing =
    automationQuery.isRefetching ||
    runsQuery.isRefetching ||
    triggersQuery.isRefetching;

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <PageChromeLayout
        top={
          <PageHeader
            onBack={() => router.back()}
            right={
              <HeaderEditButton
                onPress={() =>
                  router.push(`/automations/${automationId}/edit` as never)
                }
              />
            }
            title={automation.name}
          />
        }
      >
        {({ topInset }) => (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingTop: topInset + 10 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void refresh()}
              />
            }
          >
            <AutomationHero
              description={automation.description}
              isRunning={triggerAutomation.isPending}
              projectName={automation.project_name}
              schedule={scheduleLabel(automation.cron_expression)}
              onDelete={() => setDeleteAutomationOpen(true)}
              onRun={() => void run()}
            />

            <View
              accessibilityRole="tablist"
              style={[
                styles.tabs,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <TabButton
                active={activeTab === "integrations"}
                badge={triggers.length}
                label="Integrations"
                onPress={() => setActiveTab("integrations")}
              />
              <TabButton
                active={activeTab === "tasks"}
                badge={tasks.length}
                label="Tasks"
                onPress={() => setActiveTab("tasks")}
              />
              <TabButton
                active={activeTab === "runs"}
                label="Runs"
                onPress={() => setActiveTab("runs")}
              />
            </View>

            {activeTab === "integrations" ? (
              <View style={styles.tabPanel}>
                <ContentHeader
                  description="Services that can start this automation."
                  title="Connections"
                  action={
                    <SmallButton
                      label="Add"
                      onPress={() => setCreateOpen(true)}
                      primary
                    />
                  }
                />
                {triggersQuery.isPending ? (
                  <ActivityIndicator />
                ) : triggersQuery.isError ? (
                  <ErrorWithRetry
                    label="Integrations could not be loaded."
                    onRetry={() => void triggersQuery.refetch()}
                  />
                ) : triggers.length === 0 ? (
                  <IntegrationEmpty onAdd={() => setCreateOpen(true)} />
                ) : (
                  triggers.map((trigger) => (
                    <IntegrationCard
                      key={trigger.id}
                      onOpen={() =>
                        router.push(
                          `/automations/${automationId}/triggers/${trigger.id}` as never,
                        )
                      }
                      trigger={trigger}
                    />
                  ))
                )}
              </View>
            ) : null}

            {activeTab === "tasks" ? (
              <View style={styles.tabPanel}>
                <ContentHeader
                  description="Executed from top to bottom."
                  title="Tasks"
                />
                {tasks.map((task, index) => (
                  <View
                    key={task.id}
                    style={[
                      styles.card,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                  >
                    <View style={styles.taskHeader}>
                      <View
                        style={[
                          styles.taskNumber,
                          { backgroundColor: theme.background },
                        ]}
                      >
                        <ThemedText style={styles.taskNumberText}>
                          {index + 1}
                        </ThemedText>
                      </View>
                      <View style={styles.flex}>
                        <ThemedText style={styles.taskAgent}>
                          {task.agent.replaceAll("-", " ")}
                        </ThemedText>
                        <ThemedText
                          numberOfLines={1}
                          style={styles.code}
                          themeColor="textSecondary"
                        >
                          {task.path_from_code}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.bodyCopy}>
                      {task.task_prompt}
                    </ThemedText>
                    {task.model ? (
                      <ThemedText
                        style={styles.meta}
                        themeColor="textSecondary"
                      >
                        Model: {task.model}
                      </ThemedText>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {activeTab === "runs" ? (
              <View style={styles.tabPanel}>
                <ContentHeader
                  description="Manual, scheduled, and webhook activity."
                  title="Run history"
                />
                {runsQuery.isPending ? (
                  <ActivityIndicator />
                ) : runsQuery.isError ? (
                  <ErrorWithRetry
                    label="Runs could not be loaded."
                    onRetry={() => void runsQuery.refetch()}
                  />
                ) : runs.length === 0 ? (
                  <EmptyText>No automation runs yet.</EmptyText>
                ) : (
                  runs.map((runItem) => (
                    <AutomationRunCard
                      automation={automation}
                      key={runItem.id}
                      run={runItem}
                    />
                  ))
                )}
                {runs.length > 0 &&
                (currentPage > 1 || runsQuery.data?.has_next) ? (
                  <Pagination
                    currentPage={currentPage}
                    disabled={runsQuery.isFetching}
                    hasNext={Boolean(runsQuery.data?.has_next)}
                    onNext={() => setPage(currentPage + 1)}
                    onPrevious={() => setPage(Math.max(1, currentPage - 1))}
                  />
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        )}
      </PageChromeLayout>
      <AutomationTriggerDrawer
        automationId={automationId}
        onClose={() => setCreateOpen(false)}
        visible={createOpen}
      />
      <ConfirmationDrawer
        confirmLabel="Delete automation"
        description="This automation will no longer appear in your automations and cannot be restored."
        isConfirming={deleteAutomation.isPending}
        onCancel={() => setDeleteAutomationOpen(false)}
        onConfirm={() => void removeAutomation()}
        title="Delete automation?"
        visible={deleteAutomationOpen}
      />
    </SafeAreaView>
  );
}

function ScreenState({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[
        styles.screen,
        styles.centered,
        { backgroundColor: theme.background },
      ]}
    >
      {children}
    </SafeAreaView>
  );
}
function ContentHeader({
  action,
  description,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <View style={styles.contentHeader}>
      <View style={styles.flex}>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
        <ThemedText style={styles.meta} themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      {action}
    </View>
  );
}
function HeaderEditButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel="Edit automation"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerEditButton,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{ ios: "pencil", android: "edit" }}
        size={18}
        tintColor={theme.text}
      />
    </Pressable>
  );
}
function AutomationHero({
  description,
  isRunning,
  projectName,
  schedule,
  onDelete,
  onRun,
}: {
  description: string | null;
  isRunning: boolean;
  projectName: string;
  schedule: string;
  onDelete: () => void;
  onRun: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.hero}>
      <ThemedText
        numberOfLines={2}
        style={styles.heroDescription}
        themeColor="textSecondary"
      >
        {description || "No description provided."}
      </ThemedText>
      <View style={styles.heroMeta}>
        <MetaItem
          icon={{ ios: "folder.fill", android: "folder" }}
          label={projectName}
        />
        <MetaItem
          icon={{ ios: "clock", android: "schedule" }}
          label={schedule}
        />
      </View>
      <View style={styles.heroActions}>
        <Pressable
          accessibilityRole="button"
          disabled={isRunning}
          onPress={onRun}
          style={({ pressed }) => [
            styles.runNowButton,
            { backgroundColor: theme.text },
            (pressed || isRunning) && styles.pressed,
          ]}
        >
          {isRunning ? (
            <ActivityIndicator color={theme.background} size="small" />
          ) : (
            <SymbolView
              name={{ ios: "play.fill", android: "play_arrow" }}
              size={16}
              tintColor={theme.background}
            />
          )}
          <ThemedText style={[styles.runNowText, { color: theme.background }]}>
            {isRunning ? "Starting run…" : "Run now"}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityLabel="Delete automation"
          accessibilityRole="button"
          onPress={onDelete}
          style={({ pressed }) => [
            styles.automationDeleteButton,
            { borderColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: "trash", android: "delete" }}
            size={17}
            tintColor="#dc2626"
          />
        </Pressable>
      </View>
    </View>
  );
}
function MetaItem({
  icon,
  label,
}: {
  icon: SymbolViewProps["name"];
  label: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.metaItem}>
      <SymbolView name={icon} size={13} tintColor={theme.textSecondary} />
      <ThemedText
        numberOfLines={1}
        style={styles.meta}
        themeColor="textSecondary"
      >
        {label}
      </ThemedText>
    </View>
  );
}
function IntegrationEmpty({ onAdd }: { onAdd: () => void }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.integrationEmpty,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <View style={[styles.emptyIcon, { backgroundColor: theme.background }]}>
        <SymbolView
          name={{ ios: "link", android: "link" }}
          size={20}
          tintColor={theme.text}
        />
      </View>
      <ThemedText style={styles.emptyTitle}>No connections yet</ThemedText>
      <ThemedText style={styles.centerCopy} themeColor="textSecondary">
        Add a webhook integration to let another service start this automation.
      </ThemedText>
      <SmallButton label="Add integration" onPress={onAdd} primary />
    </View>
  );
}
function IntegrationCard({
  onOpen,
  trigger,
}: {
  onOpen: () => void;
  trigger: Trigger;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.integrationCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={`Open ${trigger.name} integration`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.integrationMain,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[styles.providerIcon, { backgroundColor: theme.background }]}
        >
          <SymbolView
            name={{ ios: "link", android: "link" }}
            size={18}
            tintColor={theme.text}
          />
        </View>
        <View style={styles.flex}>
          <View style={styles.integrationTitleRow}>
            <ThemedText numberOfLines={1} style={styles.cardTitle}>
              {trigger.name}
            </ThemedText>
          </View>
          <ThemedText style={styles.meta} themeColor="textSecondary">
            Last used {formatAutomationDate(trigger.lasted_triggered_at)}
          </ThemedText>
        </View>
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right" }}
          size={17}
          tintColor={theme.textSecondary}
        />
      </Pressable>
    </View>
  );
}
function TabButton({
  active,
  badge,
  label,
  onPress,
}: {
  active: boolean;
  badge?: number;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        active && { backgroundColor: theme.background },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        numberOfLines={1}
        style={[styles.tabText, !active && { color: theme.textSecondary }]}
      >
        {label}
      </ThemedText>
      {badge !== undefined ? (
        <View style={styles.tabBadge}>
          <ThemedText style={styles.tabBadgeText}>{badge}</ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}
function Pill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <ThemedText style={styles.pillText}>{label}</ThemedText>
    </View>
  );
}
function EmptyText({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.empty, { borderColor: theme.backgroundSelected }]}>
      <ThemedText style={styles.centerCopy} themeColor="textSecondary">
        {children}
      </ThemedText>
    </View>
  );
}
function ErrorWithRetry({
  label,
  onRetry,
}: {
  label: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.errorRow}>
      <ThemedText style={styles.error}>{label}</ThemedText>
      <SmallButton label="Try again" onPress={onRetry} />
    </View>
  );
}
function SmallButton({
  destructive = false,
  label,
  onPress,
  primary = false,
}: {
  destructive?: boolean;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const theme = useTheme();
  const backgroundColor = destructive
    ? "rgba(220,38,38,0.1)"
    : primary
      ? theme.text
      : theme.backgroundElement;
  const color = destructive
    ? "#dc2626"
    : primary
      ? theme.background
      : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText style={[styles.buttonText, { color }]}>{label}</ThemedText>
    </Pressable>
  );
}
function Pagination({
  currentPage,
  disabled,
  hasNext,
  onNext,
  onPrevious,
}: {
  currentPage: number;
  disabled: boolean;
  hasNext: boolean;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <View style={styles.pagination}>
      <SmallButton label="Previous" onPress={onPrevious} />
      <ThemedText themeColor="textSecondary">Page {currentPage}</ThemedText>
      <SmallButton
        label="Next"
        onPress={hasNext && !disabled ? onNext : () => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bodyCopy: { fontSize: 13, lineHeight: 20 },
  button: {
    borderRadius: 9,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 11,
  },
  buttonText: { fontSize: 12, fontWeight: "700" },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 11,
    padding: 14,
  },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  centerCopy: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  centered: {
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  code: { fontFamily: "monospace", fontSize: 11 },
  content: { gap: 14, paddingBottom: 44, paddingHorizontal: 16 },
  contentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  empty: {
    borderRadius: 12,
    borderStyle: "dashed",
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  error: { color: "#dc2626", fontSize: 13 },
  errorRow: { alignItems: "flex-start", gap: 8 },
  errorTitle: { color: "#dc2626", fontSize: 17, fontWeight: "700" },
  flex: { flex: 1 },
  headerEditButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  hero: {
    gap: 12,
  },
  heroActions: { flexDirection: "row", gap: 9 },
  heroDescription: { fontSize: 16, fontWeight: "400", lineHeight: 23 },
  heroMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  emptyIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700" },
  integrationCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  integrationEmpty: {
    alignItems: "center",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    padding: 24,
  },
  integrationMain: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  integrationTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  meta: { fontSize: 12, lineHeight: 17 },
  metaItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    maxWidth: "100%",
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    paddingTop: 4,
  },
  pill: {
    backgroundColor: "rgba(127,127,127,0.14)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  providerIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pressed: { opacity: 0.65 },
  primaryAction: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 14,
  },
  primaryActionText: { fontSize: 13, fontWeight: "700" },
  runNowButton: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    flex: 1,
    minHeight: 42,
  },
  runNowText: { fontSize: 13, fontWeight: "800" },
  screen: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  automationDeleteButton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    height: 42,
    flexDirection: "row",
    justifyContent: "center",
    width: 42,
  },
  tab: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 7,
  },
  tabBadge: {
    alignItems: "center",
    backgroundColor: "rgba(127,127,127,0.16)",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 18,
    minWidth: 18,
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, fontWeight: "700" },
  tabPanel: { gap: 11, paddingTop: 4 },
  tabs: { borderRadius: 12, flexDirection: "row", gap: 3, padding: 3 },
  tabText: { fontSize: 11, fontWeight: "700" },
  taskAgent: { fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  taskHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  taskNumber: {
    alignItems: "center",
    borderRadius: 11,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  taskNumberText: { fontSize: 12, fontWeight: "800" },
  titleRow: { alignItems: "flex-start", flexDirection: "row", gap: 9 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
