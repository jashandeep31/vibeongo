import {
  useDeleteProjectAutomationTrigger,
  useGetProjectAutomation,
  useGetProjectAutomationTrigger,
} from "@repo/api-hooks";
import * as Clipboard from "expo-clipboard";
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
import { RotateTriggerTokenDrawer } from "@/components/automations/rotate-trigger-token-drawer";
import {
  formatAutomationDate,
  getApiErrorMessage,
} from "@/components/automations/automation-utils";
import { ConfirmationDrawer } from "@/components/confirmation-drawer";
import { PageChromeLayout, PageHeader } from "@/components/page-chrome";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export default function TriggerDetailsScreen() {
  const params = useLocalSearchParams<{
    automationId?: string | string[];
    triggerId?: string | string[];
  }>();
  const automationId =
    typeof params.automationId === "string" ? params.automationId : null;
  const triggerId =
    typeof params.triggerId === "string" ? params.triggerId : null;
  const router = useRouter();
  const theme = useTheme();
  const [page, setPage] = useState(1);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const automationQuery = useGetProjectAutomation(automationId);
  const triggerQuery = useGetProjectAutomationTrigger(automationId, triggerId, {
    page,
    limit: 10,
  });
  const deleteTrigger = useDeleteProjectAutomationTrigger();
  const refresh = async () => {
    await Promise.all([automationQuery.refetch(), triggerQuery.refetch()]);
  };

  if (automationQuery.isPending || triggerQuery.isPending)
    return (
      <ScreenState>
        <ActivityIndicator />
        <ThemedText themeColor="textSecondary">Loading integration…</ThemedText>
      </ScreenState>
    );
  if (
    automationQuery.isError ||
    triggerQuery.isError ||
    !automationQuery.data ||
    !triggerQuery.data ||
    !automationId ||
    !triggerId
  )
    return (
      <ScreenState>
        <ThemedText style={styles.errorTitle}>
          Integration could not be loaded
        </ThemedText>
        <ThemedText style={styles.centerCopy} themeColor="textSecondary">
          {getApiErrorMessage(
            triggerQuery.error,
            "It may have been removed, or you may not have access to it.",
          )}
        </ThemedText>
        <Button label="Go back" onPress={() => router.back()} />
      </ScreenState>
    );

  const automation = automationQuery.data.project_automation;
  const {
    trigger,
    runs,
    has_next: hasNext,
    page: currentPage,
  } = triggerQuery.data;
  const copy = async () => {
    await Clipboard.setStringAsync(trigger.webhook_url);
    Toast.show({ type: "success", text1: "Webhook URL copied" });
  };
  const remove = async () => {
    try {
      const response = await deleteTrigger.mutateAsync({
        automationId,
        triggerId,
      });
      Toast.show({ type: "success", text1: response.message });
      setDeleteOpen(false);
      router.replace(`/automations/${automationId}` as never);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not delete integration",
        text2: getApiErrorMessage(error, "Try again."),
      });
    }
  };
  const refreshing = automationQuery.isRefetching || triggerQuery.isRefetching;

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <PageChromeLayout
        top={
          <PageHeader
            onBack={() =>
              router.replace(`/automations/${automationId}` as never)
            }
            title="Integration"
          />
        }
      >
        {({ topInset }) => (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingTop: topInset + 12 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void refresh()}
              />
            }
          >
            <IntegrationHero
              name={trigger.name}
              onCopy={() => void copy()}
              onDelete={() => setDeleteOpen(true)}
              onRotate={() => setRotateOpen(true)}
            />
            <View style={styles.stats}>
              <Detail
                label="Last event"
                value={formatAutomationDate(trigger.lasted_triggered_at)}
              />
              <Detail
                label="Connected"
                value={formatAutomationDate(trigger.created_at)}
              />
            </View>
            <View
              style={[
                styles.section,
                { borderColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText style={styles.sectionTitle}>Trigger runs</ThemedText>
              <ThemedText style={styles.sectionCopy} themeColor="textSecondary">
                Requests received by this integration.
              </ThemedText>
              <View style={styles.runList}>
                {runs.length === 0 ? (
                  <View
                    style={[
                      styles.empty,
                      { borderColor: theme.backgroundSelected },
                    ]}
                  >
                    <ThemedText
                      style={styles.centerCopy}
                      themeColor="textSecondary"
                    >
                      No runs have been received yet.
                    </ThemedText>
                  </View>
                ) : (
                  runs.map((run) => (
                    <AutomationRunCard
                      automation={automation}
                      key={run.id}
                      run={run}
                    />
                  ))
                )}
              </View>
              {runs.length > 0 && (currentPage > 1 || hasNext) ? (
                <View style={styles.pagination}>
                  <Button
                    label="Previous"
                    onPress={() => setPage(Math.max(1, currentPage - 1))}
                  />
                  <ThemedText themeColor="textSecondary">
                    Page {currentPage}
                  </ThemedText>
                  <Button
                    label="Next"
                    onPress={
                      hasNext ? () => setPage(currentPage + 1) : () => {}
                    }
                  />
                </View>
              ) : null}
            </View>
          </ScrollView>
        )}
      </PageChromeLayout>
      <RotateTriggerTokenDrawer
        automationId={automationId}
        onClose={() => setRotateOpen(false)}
        triggerId={triggerId}
        triggerName={trigger.name}
        visible={rotateOpen}
      />
      <ConfirmationDrawer
        confirmLabel="Delete integration"
        description="This will disable the webhook and stop it from accepting new events."
        isConfirming={deleteTrigger.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void remove()}
        title="Delete integration?"
        visible={deleteOpen}
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
function IntegrationHero({
  name,
  onCopy,
  onDelete,
  onRotate,
}: {
  name: string;
  onCopy: () => void;
  onDelete: () => void;
  onRotate: () => void;
}) {
  return (
    <View style={styles.hero}>
      <ThemedText style={styles.integrationName}>{name}</ThemedText>
      <View style={styles.quickActions}>
        <QuickAction
          icon={{ ios: "doc.on.doc", android: "content_copy" }}
          label="Copy URL"
          onPress={onCopy}
        />
        <QuickAction
          icon={{ ios: "arrow.triangle.2.circlepath", android: "refresh" }}
          label="Rotate token"
          onPress={onRotate}
        />
        <QuickAction
          destructive
          icon={{ ios: "trash", android: "delete" }}
          label="Delete"
          onPress={onDelete}
        />
      </View>
    </View>
  );
}
function QuickAction({
  destructive = false,
  icon,
  label,
  onPress,
}: {
  destructive?: boolean;
  icon: SymbolViewProps["name"];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: destructive
            ? "rgba(220,38,38,0.12)"
            : theme.backgroundElement,
        },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={icon}
        size={15}
        tintColor={destructive ? "#dc2626" : theme.text}
      />
      <ThemedText
        style={[styles.quickActionText, destructive && styles.destructive]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <ThemedText style={styles.detailLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}
function Button({
  destructive = false,
  label,
  onPress,
}: {
  destructive?: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: destructive
            ? "rgba(220,38,38,0.1)"
            : theme.backgroundElement,
        },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        style={[styles.buttonText, destructive && styles.destructive]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 9,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 12,
  },
  buttonText: { fontSize: 12, fontWeight: "700" },
  centered: {
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  centerCopy: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  content: { gap: 14, paddingBottom: 44, paddingHorizontal: 18 },
  destructive: { color: "#dc2626" },
  detail: { gap: 4 },
  detailLabel: { fontSize: 11 },
  detailValue: { fontSize: 14 },
  empty: {
    borderRadius: 12,
    borderStyle: "dashed",
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
  },
  errorTitle: { color: "#dc2626", fontSize: 17, fontWeight: "700" },
  flex: { flex: 1 },
  hero: {
    gap: 12,
  },
  integrationName: { fontSize: 18, fontWeight: "400", lineHeight: 26 },
  meta: { fontSize: 12, lineHeight: 17 },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginTop: 14,
  },
  pressed: { opacity: 0.65 },
  quickAction: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 6,
  },
  quickActions: { flexDirection: "row", gap: 7 },
  quickActionText: { fontSize: 11, fontWeight: "700" },
  runList: { gap: 11, marginTop: 15 },
  screen: { flex: 1 },
  section: { paddingTop: 8 },
  sectionCopy: { fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  stats: {
    flexDirection: "row",
    gap: 24,
    paddingHorizontal: 2,
  },
  title: { fontSize: 23, fontWeight: "700", lineHeight: 29 },
});
