import {
  useGetProjectDomainsById,
  useUpdateProjectRoutingTargetInstance,
} from "@repo/api-hooks";
import { useProjectsStore } from "@repo/app-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { RuntimeToolCard } from "@/components/projects/runtime-tool-card";
import { Fonts } from "@/constants/theme";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";
import { useVibeongoRuntimeSocket } from "@/hooks/use-vibeongo-runtime-socket";

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
  const runtimeInstanceId = runtime.instance?.id ?? "";
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
  const domainsPointToRuntime = Boolean(
    runtime.instance &&
    domainsQuery.data?.target_instance_id === runtimeInstanceId,
  );
  const t3CodeDomain = domainsPointToRuntime
    ? (domainsQuery.data?.proxy_domains.find(
        (domain) => domain.target_port === 3773,
      )?.domain ?? "")
    : "";
  const cpuPercent = normalizePercent(runtimeSocket.stats?.cpu_percent);
  const memoryPercent = normalizePercent(runtimeSocket.stats?.used_percent);
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

            <RuntimeToolCard
              disabled={!t3CodeDomain}
              isConnected={runtimeSocket.status === "connected"}
              lastMessage={runtimeSocket.lastMessage}
              sendJsonMessage={runtimeSocket.sendJsonMessage}
              tool="codex"
              url={t3CodeDomain ? `https://${t3CodeDomain}` : ""}
            />

            {!domainsQuery.isPending && !t3CodeDomain ? (
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
                    Point the project domains to this running instance to use T3
                    Code.
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
    </SafeAreaView>
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
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16,
  },
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
