import {
  useGetProjectDomainsById,
  useRestartDevScript,
  useUpdateInstanceTime,
  useUpdateProjectRoutingTargetInstance,
} from "@repo/api-hooks";
import { useProjectsStore } from "@repo/app-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { ThemedText } from "@/components/themed-text";
import { RuntimeShellToolsCard } from "@/components/projects/runtime-shell-tools-card";
import { RuntimeToolCard } from "@/components/projects/runtime-tool-card";
import { Fonts } from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";
import { useVibeongoRuntimeSocket } from "@/hooks/use-vibeongo-runtime-socket";
import {
  formatInstanceTimeRemaining,
  getInstanceRemainingMs,
} from "@/lib/instance-expiry";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getConfigValue(config: unknown, key: string) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  const value = (config as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function normalizePercent(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value ?? 0));
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "Unavailable";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unavailable";
  return date.toLocaleString();
}

function formatUptime(value: Date | string | null | undefined, now: number) {
  if (!value) return "Unavailable";
  const startedAt =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(startedAt)) return "Unavailable";

  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function ProjectSettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const logsRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{
    projectId?: string | string[];
    projectSessionId?: string | string[];
  }>();
  const projectId = firstParam(params.projectId);
  const projectSessionId = firstParam(params.projectSessionId);
  const projectName = useProjectsStore(
    (store) =>
      store.projects.find((project) => project.id === projectId)?.name ??
      "Project",
  );
  const runtime = useProjectRuntime(projectSessionId);
  const now = useCurrentTime(Boolean(runtime.instance));
  const runtimeInstanceId = runtime.instance?.id ?? "";
  const updateInstanceTime = useUpdateInstanceTime(projectSessionId);
  const [extendTimeOpen, setExtendTimeOpen] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState("60");
  const domainsQuery = useGetProjectDomainsById(projectId, Boolean(projectId));
  const assignDomains = useUpdateProjectRoutingTargetInstance();
  const runtimeUrl = runtime.instance
    ? `https://3101-${runtime.instance.id}${runtime.instance.proxy_domain}`
    : "";
  const localToken = getConfigValue(
    runtime.instance?.config,
    "vibeongoLocalToken",
  );
  const runtimeSocket = useVibeongoRuntimeSocket({
    accessToken: runtime.accessToken,
    enabled: Boolean(runtime.instance),
    localToken,
    runtimeUrl,
  });
  const restartDevScript = useRestartDevScript({
    instanceId: runtimeInstanceId,
    runtimeUrl,
    localToken,
    accessToken: runtime.accessToken,
  });
  const domainsPointToRuntime = Boolean(
    runtime.instance &&
    domainsQuery.data?.target_instance_id === runtimeInstanceId,
  );
  const t3CodeDomain = domainsPointToRuntime
    ? (domainsQuery.data?.proxy_domains.find(
        (domain) => domain.target_port === 3773,
      )?.domain ?? "")
    : "";
  const opencodeDomain = domainsPointToRuntime
    ? (domainsQuery.data?.proxy_domains.find(
        (domain) => domain.target_port === 4096,
      )?.domain ?? "")
    : "";
  const cpuPercent = normalizePercent(runtimeSocket.stats?.cpu_percent);
  const memoryPercent = normalizePercent(runtimeSocket.stats?.used_percent);
  const remainingTime = formatInstanceTimeRemaining(
    getInstanceRemainingMs(runtime.instance?.terminates_at, now),
  );
  const uptime = formatUptime(runtime.instance?.started_at, now);
  const statusColor =
    runtimeSocket.status === "connected"
      ? "#10b981"
      : runtimeSocket.status === "connecting"
        ? "#f59e0b"
        : "#ef4444";

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const restartInstanceDevScript = async () => {
    if (!runtime.instance || !localToken || restartDevScript.isPending) return;
    try {
      await restartDevScript.mutateAsync();
      Toast.show({ type: "success", text1: "Dev script restarted" });
    } catch {
      Toast.show({
        type: "error",
        text1: "Failed to restart dev script",
        text2: "Please try again.",
      });
    }
  };

  const extendInstanceTime = async () => {
    const timeInMinutes = Number(extendMinutes);
    if (!Number.isInteger(timeInMinutes) || timeInMinutes < 1) {
      Alert.alert(
        "Invalid time",
        "Enter a whole number of minutes greater than zero.",
      );
      return;
    }
    if (!runtime.instance || updateInstanceTime.isPending) return;

    try {
      await updateInstanceTime.mutateAsync({
        action: "increase",
        id: runtime.instance.id,
        timeInMinutes,
      });
      setExtendTimeOpen(false);
      Toast.show({
        type: "success",
        text1: "Instance time extended",
        text2: `Added ${timeInMinutes} minutes.`,
      });
    } catch {
      Toast.show({ type: "error", text1: "Failed to extend instance time" });
    }
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <View
        style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}
      >
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={goBack}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: "chevron.left", android: "arrow_back" }}
            size={21}
            tintColor={theme.text}
            weight="medium"
          />
        </Pressable>
        <View style={styles.headerTitleRow}>
          <ThemedText numberOfLines={1} style={styles.headerTitle}>
            {projectName}
          </ThemedText>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {runtime.isPending ? (
          <View style={styles.state}>
            <ActivityIndicator color={theme.textSecondary} />
            <ThemedText themeColor="textSecondary">Loading runtime…</ThemedText>
          </View>
        ) : runtime.isError || !runtime.instance ? (
          <View style={styles.state}>
            <SymbolView
              name={{ ios: "exclamationmark.circle", android: "error_outline" }}
              size={28}
              tintColor={theme.textSecondary}
            />
            <ThemedText style={styles.stateTitle}>
              Runtime unavailable
            </ThemedText>
            <ThemedText style={styles.stateCopy} themeColor="textSecondary">
              Resume this project session before opening its runtime settings.
            </ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <RuntimeStat
                icon={{ ios: "cpu", android: "memory" }}
                label="CPU"
                percent={cpuPercent}
              />
              <RuntimeStat
                icon={{ ios: "memorychip", android: "storage" }}
                label="Memory"
                percent={memoryPercent}
              />
            </View>

            <View
              style={[
                styles.card,
                styles.timeCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <View style={styles.timeHeader}>
                <View style={styles.timeTitleRow}>
                  <SymbolView
                    name={{ ios: "clock", android: "schedule" }}
                    size={17}
                    tintColor={theme.textSecondary}
                  />
                  <ThemedText style={styles.cardTitle}>Runtime</ThemedText>
                </View>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <ThemedText style={styles.liveLabel}>LIVE</ThemedText>
                </View>
              </View>

              <View
                style={[
                  styles.countdown,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <ThemedText
                  style={styles.countdownLabel}
                  themeColor="textSecondary"
                >
                  Terminates in
                </ThemedText>
                <ThemedText style={styles.countdownValue}>
                  {remainingTime}
                </ThemedText>
              </View>

              <View style={styles.timeMetrics}>
                <TimeMetric
                  label="Started"
                  value={formatDateTime(runtime.instance.started_at)}
                />
                <View
                  style={[
                    styles.timeDivider,
                    { backgroundColor: theme.backgroundSelected },
                  ]}
                />
                <TimeMetric label="Uptime" value={uptime} />
              </View>

              <Pressable
                accessibilityLabel="Extend instance time"
                accessibilityRole="button"
                disabled={runtime.instance.runtime_kind === "sandbox"}
                onPress={() => setExtendTimeOpen(true)}
                style={({ pressed }) => [
                  styles.extendButton,
                  runtime.instance?.runtime_kind === "sandbox" &&
                    styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: "plus", android: "add" }}
                  size={16}
                  tintColor="#ffffff"
                  weight="semibold"
                />
                <ThemedText style={styles.extendButtonLabel}>
                  Extend time
                </ThemedText>
              </Pressable>
              {runtime.instance.runtime_kind === "sandbox" ? (
                <ThemedText style={styles.timeHint} themeColor="textSecondary">
                  Sandbox instances cannot extend their time.
                </ThemedText>
              ) : null}
            </View>

            <View
              style={[
                styles.card,
                styles.devScriptCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <View style={styles.devScriptCopy}>
                <ThemedText style={styles.cardTitle}>Dev Script</ThemedText>
                <ThemedText
                  style={styles.devScriptDescription}
                  themeColor="textSecondary"
                >
                  Restart the development processes for this instance.
                </ThemedText>
              </View>
              <Pressable
                accessibilityLabel="Restart dev script"
                accessibilityRole="button"
                disabled={!localToken || restartDevScript.isPending}
                onPress={() => void restartInstanceDevScript()}
                style={({ pressed }) => [
                  styles.restartButton,
                  { borderColor: theme.backgroundSelected },
                  (!localToken || restartDevScript.isPending) &&
                    styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {restartDevScript.isPending ? (
                  <ActivityIndicator color={theme.text} size="small" />
                ) : (
                  <SymbolView
                    name={{ ios: "arrow.clockwise", android: "refresh" }}
                    size={16}
                    tintColor={theme.text}
                  />
                )}
                <ThemedText style={styles.restartButtonLabel}>
                  {restartDevScript.isPending ? "Restarting…" : "Restart"}
                </ThemedText>
              </Pressable>
            </View>

            <RuntimeToolCard
              disabled={!opencodeDomain}
              isConnected={runtimeSocket.status === "connected"}
              lastMessage={runtimeSocket.toolMessages.opencode ?? null}
              opencodePassword={runtime.password}
              sendJsonMessage={runtimeSocket.sendJsonMessage}
              tool="opencode"
              url={opencodeDomain ? `https://${opencodeDomain}` : ""}
            />

            <RuntimeToolCard
              disabled={!t3CodeDomain}
              isConnected={runtimeSocket.status === "connected"}
              lastMessage={runtimeSocket.toolMessages.codex ?? null}
              sendJsonMessage={runtimeSocket.sendJsonMessage}
              tool="codex"
              url={t3CodeDomain ? `https://${t3CodeDomain}` : ""}
            />

            {!domainsQuery.isPending && (!opencodeDomain || !t3CodeDomain) ? (
              <View
                style={[
                  styles.domainWarning,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: "#f59e0b",
                  },
                ]}
              >
                <SymbolView
                  name={{ ios: "exclamationmark.triangle", android: "warning" }}
                  size={20}
                  tintColor="#f59e0b"
                />
                <View style={styles.domainWarningCopy}>
                  <ThemedText style={styles.domainWarningTitle}>
                    Domains are not pointed here
                  </ThemedText>
                  <ThemedText
                    style={styles.domainWarningText}
                    themeColor="textSecondary"
                  >
                    Point the project domains to this running instance to use
                    OpenCode Web and T3 Code.
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityLabel="Point project domains to this instance"
                  accessibilityRole="button"
                  disabled={assignDomains.isPending}
                  onPress={() =>
                    assignDomains.mutate(
                      { id: projectId, instanceId: runtimeInstanceId },
                      {
                        onError: (error) =>
                          Alert.alert("Could not point domains", error.message),
                      },
                    )
                  }
                  style={({ pressed }) => [
                    styles.pointDomainsButton,
                    pressed && styles.pressed,
                  ]}
                >
                  {assignDomains.isPending ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <ThemedText style={styles.pointDomainsLabel}>
                      Point domains
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            ) : null}

            {runtime.instance.runtime_kind !== "sandbox" ? (
              <RuntimeShellToolsCard
                isConnected={runtimeSocket.status === "connected"}
                sendJsonMessage={runtimeSocket.sendJsonMessage}
                subscribeJsonMessage={runtimeSocket.subscribeJsonMessage}
              />
            ) : null}

            <View
              style={[
                styles.card,
                styles.logsCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <ThemedText style={styles.cardTitle}>Logs</ThemedText>
              <ScrollView
                nestedScrollEnabled
                onContentSizeChange={() =>
                  logsRef.current?.scrollToEnd({ animated: true })
                }
                ref={logsRef}
                style={styles.logsScroll}
              >
                <ThemedText style={styles.logs} themeColor="textSecondary">
                  {runtimeSocket.logs || "Waiting for server logs…"}
                </ThemedText>
              </ScrollView>
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setExtendTimeOpen(false)}
        transparent
        visible={extendTimeOpen}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <Pressable
            accessibilityLabel="Close extend time dialog"
            onPress={() => setExtendTimeOpen(false)}
            style={styles.modalBackdrop}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}
          >
            <ThemedText style={styles.modalTitle}>
              Extend instance time
            </ThemedText>
            <ThemedText
              style={styles.modalDescription}
              themeColor="textSecondary"
            >
              Add minutes to this instance&apos;s current termination time.
            </ThemedText>
            <ThemedText style={styles.inputLabel}>Minutes</ThemedText>
            <TextInput
              accessibilityLabel="Minutes to extend"
              autoFocus
              editable={!updateInstanceTime.isPending}
              keyboardType="number-pad"
              onChangeText={setExtendMinutes}
              selectTextOnFocus
              style={[
                styles.timeInput,
                {
                  borderColor: theme.backgroundSelected,
                  color: theme.text,
                },
              ]}
              value={extendMinutes}
            />
            <View style={styles.modalActions}>
              <Pressable
                disabled={updateInstanceTime.isPending}
                onPress={() => setExtendTimeOpen(false)}
                style={({ pressed }) => [
                  styles.cancelButton,
                  { borderColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.cancelButtonLabel}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                disabled={updateInstanceTime.isPending}
                onPress={() => void extendInstanceTime()}
                style={({ pressed }) => [
                  styles.confirmButton,
                  updateInstanceTime.isPending && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {updateInstanceTime.isPending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : null}
                <ThemedText style={styles.extendButtonLabel}>
                  {updateInstanceTime.isPending ? "Extending…" : "Extend Time"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function TimeMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.timeMetric}>
      <ThemedText style={styles.timeMetricLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText numberOfLines={1} style={styles.timeMetricValue}>
        {value}
      </ThemedText>
    </View>
  );
}

function RuntimeStat({
  icon,
  label,
  percent,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  percent: number;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <View style={styles.statHeader}>
        <View style={styles.statLabel}>
          <SymbolView name={icon} size={16} tintColor={theme.textSecondary} />
          <ThemedText style={styles.statLabelText} themeColor="textSecondary">
            {label}
          </ThemedText>
        </View>
        <ThemedText style={styles.statValue}>{percent.toFixed(0)}%</ThemedText>
      </View>
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: theme.backgroundSelected },
        ]}
      >
        <View style={[styles.progressValue, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cancelButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  cancelButtonLabel: { fontSize: 13, fontWeight: "700" },
  confirmButton: {
    alignItems: "center",
    backgroundColor: "#3c87f7",
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  devScriptCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  devScriptCopy: {
    flex: 1,
  },
  devScriptDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  disabled: {
    opacity: 0.4,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16,
  },
  extendButton: {
    alignItems: "center",
    backgroundColor: "#3c87f7",
    borderRadius: 11,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 44,
    width: "100%",
  },
  extendButtonLabel: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  headerButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    flexShrink: 1,
  },
  headerTitleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  logs: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 18,
  },
  logsCard: {
    height: 190,
  },
  logsScroll: {
    marginTop: 12,
    flex: 1,
  },
  inputLabel: { fontSize: 12, fontWeight: "700", marginTop: 18 },
  countdown: {
    borderRadius: 12,
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  countdownLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  countdownValue: {
    fontFamily: Fonts.mono,
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  liveBadge: {
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderRadius: 20,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  liveDot: {
    backgroundColor: "#10b981",
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  liveLabel: {
    color: "#10b981",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 20,
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    width: "100%",
  },
  modalDescription: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  modalRoot: { flex: 1, justifyContent: "center", padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  progressTrack: {
    borderRadius: 4,
    height: 6,
    marginTop: 12,
    overflow: "hidden",
  },
  progressValue: {
    backgroundColor: "#3c87f7",
    borderRadius: 4,
    height: "100%",
  },
  restartButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 7,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  restartButtonLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  statCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    padding: 14,
  },
  statHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statLabel: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  statLabelText: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  timeCard: { gap: 16 },
  timeDivider: { height: "100%", width: StyleSheet.hairlineWidth },
  timeHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeHint: { fontSize: 12, lineHeight: 17 },
  timeInput: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    marginTop: 7,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  timeMetric: { flex: 1, gap: 5, minWidth: 0 },
  timeMetricLabel: { fontSize: 11, fontWeight: "600" },
  timeMetricValue: { fontSize: 13, fontWeight: "600" },
  timeMetrics: { flexDirection: "row", gap: 14, minHeight: 39 },
  timeTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  state: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 96,
  },
  stateCopy: {
    fontSize: 14,
    textAlign: "center",
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  statusDot: {
    borderRadius: 5,
    height: 9,
    width: 9,
  },
  domainWarning: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  domainWarningCopy: {
    flex: 1,
  },
  domainWarningText: {
    fontSize: 12,
    lineHeight: 17,
  },
  domainWarningTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  pointDomainsButton: {
    alignItems: "center",
    backgroundColor: "#3c87f7",
    borderRadius: 9,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 104,
    paddingHorizontal: 10,
  },
  pointDomainsLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
  },
  screen: {
    flex: 1,
  },
});
